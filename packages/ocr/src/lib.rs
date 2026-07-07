//! OCR backend for MedMe: recognizes text in image bytes (png/jpg/tiff) via
//! `oar-ocr` (PP-OCRv5, ONNX Runtime). Models are auto-downloaded from
//! ModelScope into `$OAR_HOME` (default `~/.oar`) on first use, SHA-256
//! verified, and cached for subsequent runs.
//!
//! Also handles scanned/image-only PDFs (no text layer) via `recognize_pdf`:
//! it pulls page image XObjects out of the PDF with `lopdf` and OCRs each one.

use anyhow::{Context, Result};
use lopdf::{Document, Object};
use oar_ocr::oarocr::{OAROCR, OAROCRBuilder};
use oar_ocr::utils::dynamic_to_rgb;
use std::sync::OnceLock;

static PIPELINE: OnceLock<OAROCR> = OnceLock::new();

fn pipeline() -> Result<&'static OAROCR> {
    if let Some(p) = PIPELINE.get() {
        return Ok(p);
    }
    let built = OAROCRBuilder::new(
        "pp-ocrv5_mobile_det.onnx",
        "pp-ocrv5_mobile_rec.onnx",
        "ppocrv5_dict.txt",
    )
    .build()
    .map_err(|e| anyhow::anyhow!("failed to build OAROCR pipeline: {e}"))?;
    Ok(PIPELINE.get_or_init(|| built))
}

/// Recognize text in image bytes (png/jpg/tiff/...). Returns recognized text
/// lines joined with "\n". Lazily builds the OCR pipeline on first call
/// (models auto-download from ModelScope on first ever run on this machine).
pub fn recognize(image_bytes: &[u8]) -> Result<String> {
    let ocr = pipeline()?;
    let dynamic = image::load_from_memory(image_bytes).context("ocr::recognize: decode image")?;
    let image = dynamic_to_rgb(dynamic);
    let results = ocr
        .predict(vec![image])
        .map_err(|e| anyhow::anyhow!("OCR prediction failed: {e}"))?;
    let mut lines = Vec::new();
    if let Some(result) = results.into_iter().next() {
        for region in result.text_regions {
            if let Some(text) = region.text {
                if !text.trim().is_empty() {
                    lines.push(text);
                }
            }
        }
    }
    Ok(lines.join("\n"))
}

/// OCR a PDF that has no text layer: extract each page's embedded image
/// (JPEG / `DCTDecode` XObjects -- the common encoding for App-exported
/// "image PDF" scans, e.g. Photos.app "Save as PDF" or Pillow-based
/// exporters) and OCR it via [`recognize`], joining page texts with "\n".
///
/// Only `DCTDecode`-encoded image XObjects are decoded: the stream bytes for
/// that filter are the raw JPEG, so no image-specific reconstruction is
/// needed. Other embedded-image encodings (`CCITTFaxDecode` fax scans,
/// `JPXDecode` JPEG2000, raw/Flate-encoded raster samples that would need
/// colorspace + bit-depth reconstruction) are not supported and are skipped
/// page-by-page rather than failing the whole document.
///
/// Returns an error if the PDF can't be parsed, or if no page yields any
/// non-empty OCR text.
pub fn recognize_pdf(pdf_bytes: &[u8]) -> Result<String> {
    let doc = Document::load_mem(pdf_bytes).context("recognize_pdf: parse PDF")?;
    let mut page_texts = Vec::new();
    for (_page_num, page_id) in doc.get_pages() {
        for image_bytes in extract_dct_images(&doc, page_id) {
            match recognize(&image_bytes) {
                Ok(text) if !text.trim().is_empty() => page_texts.push(text),
                Ok(_) => {}
                Err(e) => {
                    // One image failing OCR shouldn't sink the other pages.
                    eprintln!("recognize_pdf: OCR failed for one page image: {e:#}");
                }
            }
        }
    }
    if page_texts.is_empty() {
        anyhow::bail!("recognize_pdf: no OCR-able (DCTDecode) page images found in PDF");
    }
    Ok(page_texts.join("\n"))
}

/// Collect raw JPEG bytes for every `DCTDecode` image XObject directly
/// referenced by a page's `/Resources /XObject` dict. Does not recurse into
/// Form XObjects.
fn extract_dct_images(doc: &Document, page_id: lopdf::ObjectId) -> Vec<Vec<u8>> {
    let mut out = Vec::new();
    let resources = match doc.get_page_resources(page_id) {
        Ok((Some(dict), _)) => dict,
        _ => return out,
    };
    let xobjects = match resources.get(b"XObject").and_then(Object::as_dict) {
        Ok(d) => d.clone(),
        Err(_) => return out,
    };
    for (_name, obj_ref) in xobjects.iter() {
        let Object::Reference(oid) = obj_ref else {
            continue;
        };
        let Ok(Object::Stream(stream)) = doc.get_object(*oid) else {
            continue;
        };
        let is_image = stream.dict.get(b"Subtype").and_then(Object::as_name_str).ok() == Some("Image");
        if !is_image {
            continue;
        }
        let filters = stream.filters().unwrap_or_default();
        if filters.len() == 1 && filters[0] == "DCTDecode" {
            out.push(stream.content.clone());
        }
        // Other filters not handled -- see doc comment on recognize_pdf.
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Requires network access to ModelScope on first run (models are cached
    /// afterward in $OAR_HOME). Run explicitly with:
    ///   cargo test -p ocr -- --ignored
    #[test]
    #[ignore]
    fn recognizes_cjk_test_image() {
        let bytes = std::fs::read("/tmp/ocr_test.png")
            .expect("generate /tmp/ocr_test.png first (see feat-ocr-report.md)");
        let text = recognize(&bytes).expect("OCR should succeed");
        assert!(
            text.contains("Creatinine") || text.contains("肌酐"),
            "unexpected OCR text: {text}"
        );
    }

    /// Requires network access to ModelScope on first run (models are cached
    /// afterward in $OAR_HOME). Run explicitly with:
    ///   cargo test -p ocr -- --ignored
    #[test]
    #[ignore]
    fn recognizes_scanned_image_pdf() {
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../examples/demo-dataset/photos/2026-03-15_检验报告_扫描图PDF.pdf"
        );
        let bytes = std::fs::read(path).expect("demo scanned PDF present");
        let text = recognize_pdf(&bytes).expect("recognize_pdf should succeed");
        assert!(
            text.contains("肌酐") || text.contains("Creatinine"),
            "unexpected OCR text: {text}"
        );
        assert!(text.contains("2026-03-15"), "expected date in OCR text: {text}");
    }
}
