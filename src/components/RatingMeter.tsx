import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { getVoteStats, getMyVote, castVote } from "@/lib/votes.functions";
import { RATING_LABELS as LABELS, RATING_COLORS as COLORS, type Rating } from "@/lib/ratings";


const CX = 100;
const CY = 100;
const R = 78;

function polar(angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) };
}

function arc(startAngle: number, endAngle: number) {
  const s = polar(startAngle);
  const e = polar(endAngle);
  return `M ${s.x} ${s.y} A ${R} ${R} 0 0 1 ${e.x} ${e.y}`;
}

export function RatingMeter({
  mediaType,
  tmdbId,
  compact = false,
}: {
  mediaType: "movie" | "tv";
  tmdbId: number;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const statsKey = ["vote-stats", mediaType, tmdbId];
  const { data: stats } = useQuery({
    queryKey: statsKey,
    queryFn: () => getVoteStats({ data: { mediaType, tmdbId } }),
    staleTime: 60_000,
  });

  const myVoteKey = ["my-vote", mediaType, tmdbId, user?.id ?? "anon"];
  const { data: myVote } = useQuery({
    queryKey: myVoteKey,
    queryFn: () => getMyVote({ data: { mediaType, tmdbId } }),
    enabled: !!user && !compact,
  });

  const avg = stats?.average ?? 0;
  const total = stats?.total ?? 0;

  // Map average [1,3] -> angle [180 (left/red) .. 0 (right/purple)]
  const t = avg > 0 ? (Math.min(3, Math.max(1, avg)) - 1) / 2 : 0.5;
  const needleAngle = avg > 0 ? 180 - t * 180 : 90;
  const needle = polar(needleAngle);

  const overall: Rating = avg >= 2.34 ? 3 : avg >= 1.67 ? 2 : 1;

  const vote = async (rating: Rating) => {
    if (!user) {
      toast.info("Sign in to vote", { description: "Your vote needs a verified account." });
      navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      return;
    }
    try {
      await castVote({ data: { mediaType, tmdbId, rating } });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: statsKey }),
        queryClient.invalidateQueries({ queryKey: myVoteKey }),
      ]);
      toast.success(`You rated it "${LABELS[rating]}"`);
    } catch {
      toast.error("Couldn't save your vote. Please try again.");
    }
  };

  const size = compact ? 64 : 200;

  return (
    <div className={compact ? "flex flex-col items-center" : "flex flex-col items-center gap-3"}>
      <svg
        viewBox="0 0 200 110"
        width={size}
        height={(size * 110) / 200}
        role="img"
        aria-label={`Rating meter: ${total} votes, ${avg > 0 ? LABELS[overall] : "no votes yet"}`}
      >
        {([[180, 121.5, 1], [118.5, 61.5, 2], [58.5, 0, 3]] as [number, number, Rating][]).map(([a, b, r]) => (
          <path key={r} d={arc(a, b)} stroke={COLORS[r]} strokeWidth={compact ? 12 : 14} fill="none" strokeLinecap="butt" opacity={0.9} />
        ))}
        {/* needle */}
        <line
          x1={CX}
          y1={CY}
          x2={needle.x}
          y2={needle.y}
          stroke={avg > 0 ? COLORS[overall] : "hsl(0 0% 60%)"}
          strokeWidth={compact ? 3 : 4}
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={compact ? 5 : 7} fill={avg > 0 ? COLORS[overall] : "hsl(0 0% 60%)"} />
      </svg>

      {!compact && (
        <>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">
              {avg > 0 ? LABELS[overall] : "No votes yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{total.toLocaleString()}</span>{" "}
              {total === 1 ? "vote" : "votes"}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {([1, 2, 3] as Rating[]).map((r) => {
              const active = myVote?.rating === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => vote(r)}
                  className="rounded-full border px-4 py-1.5 text-sm font-semibold transition-all"
                  style={{
                    borderColor: COLORS[r],
                    color: active ? "white" : COLORS[r],
                    backgroundColor: active ? COLORS[r] : "transparent",
                  }}
                >
                  {LABELS[r]}
                </button>
              );
            })}
          </div>
          {user && myVote?.rating ? (
            <p className="text-xs text-muted-foreground">Your vote: {LABELS[myVote.rating]}</p>
          ) : !user ? (
            <p className="text-xs text-muted-foreground">Sign in to cast your genuine vote.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
