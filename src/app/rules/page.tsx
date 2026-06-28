import PageWrapper from "@/components/layout/PageWrapper";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Trophy, Target, Zap, Lock, EyeOff, BookOpen } from "lucide-react";

export const metadata = { title: "Scoring Rules — KickPick" };

function RuleCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function ScoreRow({
  pts,
  color,
  label,
  example,
}: {
  pts: number;
  color: string;
  label: string;
  example: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border last:border-0">
      <span
        className={`inline-flex items-center justify-center min-w-[2.5rem] h-7 rounded-full text-sm font-bold ${color}`}
      >
        {pts}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{example}</p>
      </div>
    </div>
  );
}

export default async function RulesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <PageWrapper>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Scoring Rules</h1>
        </div>

        {/* Match predictions */}
        <RuleCard icon={Target} title="Match Score Predictions">
          <p className="text-xs text-muted-foreground">
            Predict the exact score (e.g. 2–1) for maximum points, or just
            pick a winner for partial credit. Points are higher in the knockout
            stage to keep things exciting!
          </p>

          <p className="text-xs font-semibold text-foreground">Group Stage</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <ScoreRow
              pts={6}
              color="bg-green-100 text-green-700"
              label="Exact score"
              example="You predicted 2–1, actual result was 2–1"
            />
            <ScoreRow
              pts={4}
              color="bg-blue-100 text-blue-700"
              label="Right winner + correct goal difference"
              example="You predicted 2–0 (diff +2), actual was 3–1 (diff +2) — same winner, same margin"
            />
            <ScoreRow
              pts={2}
              color="bg-amber-100 text-amber-700"
              label="Right winner only"
              example="You predicted a home win but wrong score and wrong goal diff — or used the winner-only pick"
            />
            <ScoreRow
              pts={0}
              color="bg-red-100 text-red-700"
              label="Wrong"
              example="Predicted the wrong winner (or a draw that didn't happen)"
            />
          </div>

          <p className="text-xs font-semibold text-foreground">Knockout Stage</p>
          <div className="rounded-xl border border-border overflow-hidden">
            <ScoreRow
              pts={7}
              color="bg-green-100 text-green-700"
              label="Exact score"
              example="You predicted 2–1, actual result was 2–1"
            />
            <ScoreRow
              pts={5}
              color="bg-blue-100 text-blue-700"
              label="Right winner + correct goal difference"
              example="You predicted 2–0 (diff +2), actual was 3–1 (diff +2) — same winner, same margin"
            />
            <ScoreRow
              pts={3}
              color="bg-amber-100 text-amber-700"
              label="Right winner only"
              example="You predicted a home win but wrong score and wrong goal diff — or used the winner-only pick"
            />
            <ScoreRow
              pts={0}
              color="bg-red-100 text-red-700"
              label="Wrong"
              example="Predicted the wrong winner (or a draw that didn't happen)"
            />
          </div>

          <div className="bg-muted/40 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-[11px] uppercase tracking-wide mb-1.5">
              Goal difference explained
            </p>
            <p>
              Goal difference = home goals minus away goals.
            </p>
            <p>
              <strong>2–0</strong> → diff <strong>+2</strong> &nbsp;·&nbsp;{" "}
              <strong>3–1</strong> → diff <strong>+2</strong> &nbsp;·&nbsp;{" "}
              <strong>1–0</strong> → diff <strong>+1</strong>
            </p>
            <p>
              Both of the first two have the same winner and same diff, so a 2–0
              prediction scores <strong>4 pts</strong> (group) or <strong>5 pts</strong> (knockout) when the result is 3–1.
            </p>
          </div>
        </RuleCard>

        {/* Tournament predictions */}
        <RuleCard icon={Trophy} title="Tournament Predictions">
          <p className="text-xs text-muted-foreground">
            Predict the champion, top scorer, top assist provider, and best goalkeeper. Locked as of today — no more changes.
          </p>

          <div className="rounded-xl border border-border overflow-hidden">
            <ScoreRow
              pts={15}
              color="bg-purple-100 text-purple-700"
              label="Correct World Cup Champion"
              example="You predicted Argentina and they won the tournament"
            />
            <ScoreRow
              pts={10}
              color="bg-indigo-100 text-indigo-700"
              label="Correct Golden Boot (top scorer)"
              example="You predicted Messi and he finished as the tournament's top scorer"
            />
            <ScoreRow
              pts={10}
              color="bg-indigo-100 text-indigo-700"
              label="Correct Top Assist"
              example="You predicted Di María and he finished with the most assists"
            />
            <ScoreRow
              pts={10}
              color="bg-indigo-100 text-indigo-700"
              label="Correct Best Goalkeeper"
              example="You predicted Martínez and he won the Golden Glove"
            />
          </div>
        </RuleCard>

        {/* Lock rule */}
        <RuleCard icon={Lock} title="Prediction Deadline">
          <p className="text-xs text-muted-foreground">
            Match predictions lock <span className="font-medium text-foreground">at kickoff</span>. You can predict or update your pick at any time right up until the match starts — including knockout matches once the teams are known.
          </p>
          <p className="text-xs text-muted-foreground">
            The countdown timer on each match card shows exactly how long you
            have left to predict.
          </p>
        </RuleCard>

        {/* Privacy */}
        <RuleCard icon={EyeOff} title="Prediction Privacy">
          <p className="text-xs text-muted-foreground">
            You <span className="font-medium text-foreground">cannot see other players&apos; predictions</span> until a match is fully played and scored. This keeps the game fair — no copying!
          </p>
          <p className="text-xs text-muted-foreground">
            The leaderboard shows everyone&apos;s points breakdown, but not
            their actual predicted scores.
          </p>
        </RuleCard>

        {/* Quick summary */}
        <RuleCard icon={Zap} title="Quick Summary">
          <div className="space-y-2 text-xs">
            <p className="font-semibold text-foreground">Group Stage</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Exact score", pts: "6 pts", color: "text-green-700" },
                { label: "Winner + goal diff", pts: "4 pts", color: "text-blue-700" },
                { label: "Right winner", pts: "2 pts", color: "text-amber-700" },
                { label: "Wrong", pts: "0 pts", color: "text-red-600" },
              ].map(({ label, pts, color }) => (
                <div
                  key={label}
                  className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-bold ${color}`}>{pts}</span>
                </div>
              ))}
            </div>
            <p className="font-semibold text-foreground pt-1">Knockout Stage</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Exact score", pts: "7 pts", color: "text-green-700" },
                { label: "Winner + goal diff", pts: "5 pts", color: "text-blue-700" },
                { label: "Right winner", pts: "3 pts", color: "text-amber-700" },
                { label: "Wrong", pts: "0 pts", color: "text-red-600" },
              ].map(({ label, pts, color }) => (
                <div
                  key={label}
                  className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-bold ${color}`}>{pts}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {[
                { label: "Correct champion", pts: "15 pts", color: "text-purple-700" },
                { label: "Correct top scorer", pts: "10 pts", color: "text-indigo-700" },
                { label: "Correct top assist", pts: "10 pts", color: "text-indigo-700" },
                { label: "Correct goalkeeper", pts: "10 pts", color: "text-indigo-700" },
              ].map(({ label, pts, color }) => (
                <div
                  key={label}
                  className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`font-bold ${color}`}>{pts}</span>
                </div>
              ))}
            </div>
          </div>
        </RuleCard>

        <p className="text-center text-xs text-muted-foreground pb-2">
          Good luck!{" "}
          <Link href="/matches" className="text-primary underline underline-offset-2">
            Go predict →
          </Link>
        </p>
      </div>
    </PageWrapper>
  );
}
