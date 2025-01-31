import os
import json
from gtts import gTTS

# Paths
DIALOGS_DIR = "/Users/vladyslav/proteantecs/git/myfrench-dialogs/content"

# Ensure output directory exists
def get_audio_dir(audio_path):
    audio_dir = os.path.join(DIALOGS_DIR, os.path.dirname(audio_path.lstrip("content/")))
    os.makedirs(audio_dir, exist_ok=True)
    return os.path.join(audio_dir, os.path.basename(audio_path))

def process_dialog_files():
    """Process all JSON dialog files and generate a single audio file per dialog."""
    for filename in os.listdir(DIALOGS_DIR):
        if filename.endswith(".json"):  # Only process JSON files
            filepath = os.path.join(DIALOGS_DIR, filename)
            with open(filepath, "r", encoding="utf-8") as file:
                data = json.load(file)

            audio_path = data.get("audio")
            if not audio_path:
                continue

            full_audio_path = get_audio_dir(audio_path)

            # Concatenate all French sentences
            french_text = " ".join(sentence["french"] for sentence in data.get("sentences", []) if "french" in sentence)
            if not french_text:
                continue  # Skip if there's no French text

            if not os.path.exists(full_audio_path):  # Avoid duplicate work
                print(f"Generating audio for: {filename} → {full_audio_path}")
                tts = gTTS(french_text, lang="fr")
                tts.save(full_audio_path)
            else:
                print(f"Already exists: {full_audio_path}")

# Run the script
if __name__ == "__main__":
    process_dialog_files()
    print("✅ All audio files generated!")