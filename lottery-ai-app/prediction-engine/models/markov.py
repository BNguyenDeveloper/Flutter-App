from .common import all_numbers, normalize

def markov_score(history):
    numbers = all_numbers()
    transition = {n: {m: 0 for m in numbers} for n in numbers}

    for prev, curr in zip(history, history[1:]):
        for a in prev.get("twoDigits", []):
            if a not in transition:
                continue
            for b in curr.get("twoDigits", []):
                if b in transition[a]:
                    transition[a][b] += 1

    if not history:
        return {n: 0 for n in numbers}

    latest = history[-1].get("twoDigits", [])
    raw = {n: 0 for n in numbers}

    for a in latest:
        if a not in transition:
            continue
        for b, count in transition[a].items():
            raw[b] += count

    return normalize(raw)
