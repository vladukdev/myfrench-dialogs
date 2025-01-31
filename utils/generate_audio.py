import os
import json
import asyncio
import edge_tts
from pydub import AudioSegment

# Paths
DIALOGS_DIR = "/Users/vladyslav/proteantecs/git/myfrench-dialogs/content"

# Define French voices
VOICE_FEMALE = "fr-FR-DeniseNeural"
VOICE_MALE = "fr-FR-HenriNeural"

def get_audio_dir(audio_path):
    audio_dir = os.path.join(DIALOGS_DIR, os.path.dirname(audio_path.lstrip("content/")))
    os.makedirs(audio_dir, exist_ok=True)
    return os.path.join(audio_dir, os.path.basename(audio_path))

async def generate_speech(text, voice, output_file):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)

async def process_dialog_files():
    """Process all JSON dialog files and generate a single audio file per dialog."""
    for filename in os.listdir(DIALOGS_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(DIALOGS_DIR, filename)
            with open(filepath, "r", encoding="utf-8") as file:
                data = json.load(file)

            audio_path = data.get("audio")
            if not audio_path:
                continue

            full_audio_path = get_audio_dir(audio_path)

            french_texts = [sentence["french"] for sentence in data.get("sentences", []) if "french" in sentence]
            if not french_texts:
                continue

            # Create a list to store generated audio segments
            final_audio = AudioSegment.empty()

            # Add initial silence
            silence = AudioSegment.silent(duration=500)  # 0.5 second silence

            for index, sentence in enumerate(french_texts):
                print(f"Processing sentence {index + 1}/{len(french_texts)}: {sentence}")

                temp_audio_path = f"temp_audio_{index}.mp3"
                voice = VOICE_FEMALE if index % 2 == 0 else VOICE_MALE

                # Generate speech
                await generate_speech(sentence, voice, temp_audio_path)

                # Load the audio
                audio = AudioSegment.from_mp3(temp_audio_path)

                # Add small fade in/out to prevent clipping
                audio = audio.fade_in(50).fade_out(50)

                # Add silence before the segment (except for first segment)
                if index > 0:
                    final_audio = final_audio + silence

                # Add the audio segment
                final_audio = final_audio + audio

                # Clean up temporary file
                os.remove(temp_audio_path)

            # Export the final audio
            if len(final_audio) > 0:
                # Add final silence
                final_audio = final_audio + silence
                final_audio.export(full_audio_path, format="mp3")
                print(f"Generated audio for: {filename} → {full_audio_path}")
            else:
                print(f"No audio segments generated for: {filename}")

def main():
    asyncio.run(process_dialog_files())
    print("✅ All audio files generated!")

if __name__ == "__main__":
    main()