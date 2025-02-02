import os
import json
import asyncio
import edge_tts
from pydub import AudioSegment

# Paths
DIALOGS_DIR = "/Users/vladyslav/proteantecs/git/myfrench-dialogs/content"

# Define French voices
VOICES = {
    "male": "fr-FR-HenriNeural",
    "male2": "fr-FR-RemyMultilingualNeural",
    "female": "fr-FR-DeniseNeural",
    "female2": "fr-FR-EloiseNeural",
    "child": "fr-FR-RemyMultilingualNeural"
}

# Default fallback voice
DEFAULT_VOICE = "fr-FR-DeniseNeural"

async def list_voices():
    voices = await edge_tts.list_voices()
    french_voices = [voice for voice in voices if voice["Locale"].startswith("fr")]
    for voice in french_voices:
        print(f"Name: {voice['Name']}, Short Name: {voice['ShortName']}")

def get_audio_dir(audio_path):
    audio_dir = os.path.join(DIALOGS_DIR, os.path.dirname(audio_path.lstrip("content/")))
    os.makedirs(audio_dir, exist_ok=True)
    return os.path.join(audio_dir, os.path.basename(audio_path))

async def generate_speech(text, voice, output_file):
    try:
        # Ensure text is properly encoded
        text = text.encode('utf-8').decode('utf-8')
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(output_file)
    except Exception as e:
        print(f"Error generating speech for text: {text}")
        print(f"Error details: {str(e)}")
        raise

async def process_dialog_files():
    """Process all JSON dialog files and generate a single audio file per dialog."""
    for filename in os.listdir(DIALOGS_DIR):
        if not filename.endswith(".json"):
            continue

        filepath = os.path.join(DIALOGS_DIR, filename)
        with open(filepath, "r", encoding="utf-8") as file:
            data = json.load(file)

        audio_path = data.get("audio")
        if not audio_path:
            print(f"Skipping {filename}: No audio path specified")
            continue

        full_audio_path = get_audio_dir(audio_path)

        if os.path.exists(full_audio_path):
            print(f"Skipping {filename}: Audio file already exists at {full_audio_path}")
            continue

        sentences = data.get("sentences", [])
        if not sentences:
            print(f"Skipping {filename}: No sentences found")
            continue

        final_audio = AudioSegment.empty()
        silence = AudioSegment.silent(duration=500)  # 0.5 second silence

        try:
            for index, sentence in enumerate(sentences):
                if "french" not in sentence:
                    continue

                print(f"Processing sentence {index + 1}/{len(sentences)}: {sentence['french']}")

                # Get voice type from the sentence, fallback to default if not specified
                voice_type = sentence.get("voice_type", "female")
                voice = VOICES.get(voice_type, DEFAULT_VOICE)

                temp_audio_path = f"temp_audio_{index}.mp3"

                # Generate speech
                await generate_speech(sentence["french"], voice, temp_audio_path)

                # Load and process audio
                audio = AudioSegment.from_mp3(temp_audio_path)
                audio = audio.fade_in(50).fade_out(50)

                if index > 0:
                    final_audio = final_audio + silence

                final_audio = final_audio + audio
                os.remove(temp_audio_path)

            if len(final_audio) > 0:
                final_audio = final_audio + silence
                final_audio.export(full_audio_path, format="mp3")
                print(f"Generated audio for: {filename} → {full_audio_path}")
            else:
                print(f"No audio segments generated for: {filename}")

        except Exception as e:
            print(f"Error processing {filename}: {str(e)}")
            for i in range(len(sentences)):
                temp_file = f"temp_audio_{i}.mp3"
                if os.path.exists(temp_file):
                    os.remove(temp_file)

def main():
    asyncio.run(process_dialog_files())
    print("✅ All audio files generated!")

if __name__ == "__main__":
    main()