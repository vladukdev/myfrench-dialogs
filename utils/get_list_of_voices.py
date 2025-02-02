import asyncio
import edge_tts

async def list_french_voices():
    voices = await edge_tts.list_voices()
    print("Available French voices:")
    for voice in voices:
        if voice["Locale"].startswith("fr"):
            print(f"Name: {voice['Name']}")
            print(f"ShortName: {voice['ShortName']}")
            print(f"Gender: {voice['Gender']}")
            print("---")

asyncio.run(list_french_voices())