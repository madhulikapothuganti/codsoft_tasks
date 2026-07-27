# 🖼️ AI Image Caption Generator (BLIP)

A modern, full-stack Flask web application that generates natural-language
captions for any uploaded image using Salesforce's **BLIP**
(Bootstrapping Language-Image Pre-training) model — completely free,
open-source, and running locally with no API keys required.

> Built for the **CodSoft Artificial Intelligence Internship**.

---

## 📌 Project Overview

Upload an image, and the app uses the pretrained
`Salesforce/blip-image-captioning-base` model from Hugging Face to analyze
the image and generate a descriptive caption — e.g. *"A dog running through
the grass."*

This project is pure **inference** (no training, no datasets, no custom
model building). It wraps a state-of-the-art vision-language model in a
clean, responsive Flask + Bootstrap 5 interface.

---

## ✨ Features

- 🎨 Modern glassmorphism UI with a purple gradient theme
- 📱 Fully responsive (mobile, tablet, desktop)
- 🖱️ Drag & drop image upload, plus a traditional browse button
- 🔍 Instant image preview before captioning
- 🧠 One-click AI caption generation (BLIP model)
- ⏳ Animated loading spinner while the model runs
- 📋 Copy-to-clipboard button for the generated caption
- 🔄 Reset button to start over
- ⚠️ Friendly, non-crashing error handling (invalid files, oversized
  uploads, model failures)
- 🎬 Smooth fade-in animations throughout the UI
- 🔒 100% offline after first run — no external API calls, no API keys

---

## 📂 Folder Structure

```
ImageCaptioning/
│
├── app.py                     # Flask application & routes
├── caption_generator.py       # BLIP model loading + caption logic
├── requirements.txt           # Pinned Python dependencies
├── README.md                  # Project documentation (this file)
├── .gitignore                 # Files/folders excluded from git
│
├── templates/
│   └── index.html             # Main landing page (Bootstrap 5)
│
├── static/
│   ├── css/
│   │   └── style.css          # Gradient theme, animations, layout
│   └── js/
│       └── script.js          # Drag & drop, AJAX upload, UI logic
│
└── uploads/                   # Uploaded images are temporarily stored here
```

---

## ⚙️ Installation

### Prerequisites
- **Python 3.11** installed and available on your PATH
- **Windows 11** (also works on macOS/Linux)
- ~2 GB free disk space (for PyTorch + BLIP model weights)
- Internet connection for the **first run only** (to download the model)

### 1. Create a Virtual Environment

```bash
python -m venv venv
```

### 2. Activate the Virtual Environment

**Windows (PowerShell / CMD):**
```bash
.\venv\Scripts\activate
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

### 3. Install Requirements

```bash
pip install -r requirements.txt
```

> ⏱️ This step downloads PyTorch and Transformers and may take a few
> minutes depending on your internet connection.

### 4. Run the Application

```bash
python app.py
```

The first time you run this, the BLIP model (~990 MB) will be downloaded
automatically from Hugging Face and cached locally in
`~/.cache/huggingface`. Every run after that loads instantly from the
local cache — **no internet required**.

### 5. Open in Browser

Navigate to:

```
http://127.0.0.1:5000
```

---

## 🧠 How BLIP Works

**BLIP** (Bootstrapping Language-Image Pre-training) is a vision-language
model developed by Salesforce Research. For image captioning, it works in
two conceptual stages:

1. **Vision Encoder** — A Vision Transformer (ViT) processes the input
   image and converts it into a rich set of visual feature embeddings that
   capture objects, actions, colors, and spatial relationships in the
   image.
2. **Text Decoder** — A transformer-based language decoder takes those
   visual embeddings and autoregressively generates a natural-language
   sentence describing the image, one token at a time, using beam search
   to pick the most fluent and accurate caption.

Unlike older captioning pipelines (e.g., InceptionV3 + LSTM trained from
scratch on Flickr8k), BLIP is **pretrained on millions of image-text pairs**
and used here purely for **inference** — meaning you get high-quality
captions instantly, with zero training required.

In this project:
- `transformers.BlipProcessor` prepares the image (resizing, normalization).
- `transformers.BlipForConditionalGeneration` runs the forward pass and
  generates the caption token IDs.
- The processor decodes those token IDs back into readable text.

---

## 📸 Screenshots Section

> Add screenshots of your running application here after you launch it
> locally, for example:

```
screenshots/
├── landing-page.png
├── image-preview.png
├── caption-result.png
```

Example markdown to embed them:

```markdown
![Landing Page](screenshots/landing-page.png)
![Caption Result](screenshots/caption-result.png)
```

---

## 🚀 Future Improvements

- Support for multiple caption suggestions per image
- Batch captioning for multiple images at once
- Downloadable caption + image export (e.g., as a shareable card)
- Deploy to a cloud host (Render, Railway, Hugging Face Spaces) with GPU
  acceleration for faster inference
- Add multilingual caption translation
- Add a history/gallery of previously captioned images

---

## 🛠️ Troubleshooting

**"Failed to load BLIP model" error on first run**
- Ensure you have an active internet connection the first time you run
  `python app.py`, since the model must be downloaded from Hugging Face.
- Check that you have at least ~2 GB of free disk space.

**`pip install` fails or hangs on `torch`**
- Make sure you're using Python 3.11 (`python --version`).
- Try upgrading pip first: `python -m pip install --upgrade pip`
- If on a restricted network, ensure `pypi.org` and
  `download.pytorch.org` are not blocked by a firewall/proxy.

**Port 5000 already in use**
- Close any other application using port 5000, or edit the last line of
  `app.py` and change `port=5000` to another port (e.g., `port=5050`).

**Uploaded image doesn't generate a caption / spinner never stops**
- Open your browser console (F12) to check for network errors.
- Confirm the Flask server terminal shows no errors when the request is
  made — it will log a friendly warning if the image was invalid.

**"The uploaded file is not a valid image" error**
- Confirm the file is actually a PNG, JPG, JPEG, or WEBP image and isn't
  corrupted. Try opening it in another image viewer first.

**App feels slow generating captions**
- The model runs on CPU by default (no GPU required), so generation
  typically takes a few seconds per image. This is expected behavior.

---

## 🧾 Tech Stack

| Layer        | Technology                                   |
|--------------|-----------------------------------------------|
| Backend      | Python 3.11, Flask 3.0                        |
| AI Model     | Salesforce BLIP (`blip-image-captioning-base`)|
| ML Framework | PyTorch, Hugging Face Transformers            |
| Image Utils  | Pillow, Torchvision                           |
| Frontend     | HTML5, Bootstrap 5, Vanilla JavaScript        |
| Styling      | Custom CSS (gradient/glassmorphism theme)     |

---

## 📄 License

This project was built for educational purposes as part of the CodSoft
Artificial Intelligence Internship program. The BLIP model is provided by
Salesforce Research under its respective open-source license via Hugging
Face.
