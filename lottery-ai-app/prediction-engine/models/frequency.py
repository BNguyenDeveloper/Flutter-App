from .common import all_numbers, normalize

def frequency_score(history):
    counts = {n: 0 for n in all_numbers()}
    for item in history:
        for number in item.get("twoDigits", []):
            if number in counts:
                counts[number] += 1
    return normalize(counts)
