import {Rating, RatingItem} from "@/components/ui/rating";

export function StarRating({rating}: { rating: number }) {
    const newRating = rating / 2;
    return (
        <Rating size="lg" value={newRating} max={10} readOnly step={1} className="gap-0.5 fill-yellow-400">
            {Array.from({length: 10}, (_, i) => (
                <RatingItem key={i} className="text-yellow-400"/>
            ))}
        </Rating>
    );
}
