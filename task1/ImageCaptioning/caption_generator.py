"""
caption_generator.py
---------------------
Loads the FREE Hugging Face BLIP model (Salesforce/blip-image-captioning-base)
and generates natural-language captions for uploaded images.

No API key required. No paid services. Runs fully offline after the
first model download (cached automatically by Hugging Face in
~/.cache/huggingface).
"""

import os
import threading
from PIL import Image, UnidentifiedImageError

# Silence noisy tokenizer parallelism warnings on Windows
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import torch
from transformers import BlipProcessor, BlipForConditionalGeneration


MODEL_NAME = "Salesforce/blip-image-captioning-base"


class CaptionGeneratorError(Exception):
    """Raised when the caption generator fails to load or run."""
    pass


class CaptionGenerator:
    """
    Thread-safe singleton wrapper around the BLIP model.

    The model is loaded lazily (on first use) so that Flask can start
    instantly and the model only downloads/loads when actually needed.
    """

    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.device = torch.device("cpu")
        self.processor = None
        self.model = None
        self.is_loaded = False
        self.load_error = None

    @classmethod
    def get_instance(cls):
        """Return the singleton instance, creating it if necessary."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def load_model(self):
        """
        Loads the BLIP processor and model into memory.
        Safe to call multiple times - only loads once.
        Raises CaptionGeneratorError on failure (never lets exceptions
        propagate unhandled).
        """
        if self.is_loaded:
            return

        with self._lock:
            if self.is_loaded:
                return
            try:
                self.processor = BlipProcessor.from_pretrained(MODEL_NAME)
                self.model = BlipForConditionalGeneration.from_pretrained(
                    MODEL_NAME
                )
                self.model.to(self.device)
                self.model.eval()
                self.is_loaded = True
                self.load_error = None
            except Exception as exc:  # noqa: BLE001 - we want to catch everything
                self.load_error = str(exc)
                self.is_loaded = False
                raise CaptionGeneratorError(
                    f"Failed to load BLIP model '{MODEL_NAME}'. "
                    f"Check your internet connection for the first run, "
                    f"or verify enough disk space is available. "
                    f"Details: {exc}"
                ) from exc

    def generate_caption(self, image_path: str) -> str:
        """
        Generates a caption for the image located at `image_path`.

        Returns:
            str: The generated caption text.

        Raises:
            CaptionGeneratorError: If the image is invalid or captioning fails.
        """
        # Ensure model is ready
        if not self.is_loaded:
            self.load_model()

        # Validate and open the image safely
        try:
            with Image.open(image_path) as img:
                img.verify()  # Verify it's a genuine, non-corrupted image
            # Re-open after verify() (verify() invalidates the file pointer)
            image = Image.open(image_path).convert("RGB")
        except (UnidentifiedImageError, OSError, ValueError) as exc:
            raise CaptionGeneratorError(
                "The uploaded file is not a valid image. "
                "Please upload a JPG, JPEG, or PNG file."
            ) from exc

        try:
            inputs = self.processor(images=image, return_tensors="pt").to(
                self.device
            )
            with torch.no_grad():
                output_ids = self.model.generate(
                    **inputs,
                    max_new_tokens=40,
                    num_beams=4,
                    early_stopping=True,
                )
            caption = self.processor.decode(
                output_ids[0], skip_special_tokens=True
            ).strip()

            if not caption:
                raise CaptionGeneratorError(
                    "The model could not generate a caption for this image."
                )

            # Capitalize first letter for a polished look
            caption = caption[0].upper() + caption[1:] if caption else caption
            if not caption.endswith((".", "!", "?")):
                caption += "."

            return caption
        except CaptionGeneratorError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise CaptionGeneratorError(
                f"Caption generation failed due to an internal error: {exc}"
            ) from exc


def get_generator() -> CaptionGenerator:
    """Convenience function used by app.py to access the singleton."""
    return CaptionGenerator.get_instance()
