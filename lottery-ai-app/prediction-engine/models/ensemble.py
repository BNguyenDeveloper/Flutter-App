from .frequency import frequency_score
from .gap import gap_score
from .markov import markov_score
from .common import all_numbers

def predict_numbers(history, top_k=10):
    freq = frequency_score(history)
    gap = gap_score(history)
    markov = markov_score(history)

    scored = []
    for number in all_numbers():
        final_score = (
            0.4 * freq.get(number, 0)
            + 0.3 * gap.get(number, 0)
            + 0.3 * markov.get(number, 0)
        )

        reasons = []
        if freq.get(number, 0) > 0.6:
            reasons.append("high recent frequency")
        if gap.get(number, 0) > 0.6:
            reasons.append("suitable gap")
        if markov.get(number, 0) > 0.6:
            reasons.append("positive Markov transition")
        if not reasons:
            reasons.append("balanced statistical score")

        scored.append({
            "number": number,
            "score": round(float(final_score), 4),
            "reason": ", ".join(reasons)
        })

    scored.sort(key=lambda x: (-x["score"], x["number"]))
    return scored[: max(1, min(int(top_k or 10), 30))]
