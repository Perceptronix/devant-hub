import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { demoMetrics, demoTeam } from "@/lib/demo-data";
import { StatCard } from "@/components/StatCard";
import { Zap, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — DevANT" }] }),
  component: Analytics,
});

const tipStyle = { background: "oklch(0.16 0.02 280)", border: "1px solid oklch(0.27 0.02 280)", borderRadius: 8, fontSize: 12 };

function Analytics() {
  const board = [demoTeam.owner, ...demoTeam.collaborators, ...demoTeam.contributors].sort((a, b) => b.contrib - a.contrib);
  return (
    <>
      <PageHeader title="Analytics & DORA" description="Engineering performance over the last 14 days." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Deploy Freq" value={`${demoMetrics.deployFrequency}/day`} icon={Zap} accent="success" />
        <StatCard label="Lead Time" value={`${demoMetrics.leadTimeHours}h`} icon={Clock} accent="cyan" />
        <StatCard label="Failure Rate" value={`${demoMetrics.changeFailureRate}%`} icon={AlertTriangle} accent="warning" />
        <StatCard label="MTTR" value={`${demoMetrics.mttrHours}h`} icon={ShieldCheck} accent="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Chart title="Deployment Frequency" h={240}>
          <BarChart data={demoMetrics.trend}>
            <CartesianGrid stroke="oklch(0.27 0.02 280)" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <YAxis stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <Tooltip contentStyle={tipStyle} />
            <Bar dataKey="deploys" fill="oklch(0.62 0.22 285)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </Chart>
        <Chart title="Lead Time (hours)" h={240}>
          <LineChart data={demoMetrics.trend}>
            <CartesianGrid stroke="oklch(0.27 0.02 280)" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <YAxis stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <Tooltip contentStyle={tipStyle} />
            <Line type="monotone" dataKey="leadTime" stroke="oklch(0.78 0.18 220)" strokeWidth={2} />
          </LineChart>
        </Chart>
        <Chart title="Change Failure Rate (%)" h={240}>
          <LineChart data={demoMetrics.trend}>
            <CartesianGrid stroke="oklch(0.27 0.02 280)" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <YAxis stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <Tooltip contentStyle={tipStyle} />
            <Line type="monotone" dataKey="failures" stroke="oklch(0.82 0.18 80)" strokeWidth={2} />
          </LineChart>
        </Chart>
        <Chart title="MTTR (hours)" h={240}>
          <BarChart data={demoMetrics.trend}>
            <CartesianGrid stroke="oklch(0.27 0.02 280)" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <YAxis stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <Tooltip contentStyle={tipStyle} />
            <Bar dataKey="mttr" fill="oklch(0.65 0.24 18)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </Chart>
      </div>

      <div className="glass rounded-xl p-5 animate-fade-up">
        <h2 className="font-display font-semibold text-lg mb-4">Contributor Leaderboard</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground uppercase">
            <th className="py-2">Member</th><th className="py-2 text-right">Commits</th>
            <th className="py-2 text-right">+Lines</th><th className="py-2 text-right">-Lines</th>
          </tr></thead>
          <tbody>
            {board.map((m) => (
              <tr key={m.login} className="border-t border-border">
                <td className="py-2.5 flex items-center gap-2">
                  <Avatar className="size-6"><AvatarImage src={m.avatar} /><AvatarFallback>{m.name[0]}</AvatarFallback></Avatar>
                  <span>@{m.login}</span>
                </td>
                <td className="py-2.5 text-right font-mono">{m.contrib}</td>
                <td className="py-2.5 text-right font-mono text-success">+{m.add.toLocaleString()}</td>
                <td className="py-2.5 text-right font-mono text-danger">-{m.del.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Chart({ title, h, children }: { title: string; h: number; children: React.ReactElement }) {
  return (
    <div className="glass rounded-xl p-5 animate-fade-up">
      <h3 className="font-display font-semibold text-sm mb-3">{title}</h3>
      <div style={{ height: h }}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
