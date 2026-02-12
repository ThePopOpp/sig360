import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Brain, 
  Clock, 
  Target, 
  CheckSquare, 
  ListTodo,
  Flame,
  Zap
} from "lucide-react";
import Link from "next/link";

const stats = [
  { name: "Active Sessions", value: "1", icon: MessageSquare, href: "/chat" },
  { name: "Memory Files", value: "12", icon: Brain, href: "/memory" },
  { name: "Scheduled Jobs", value: "3", icon: Clock, href: "/cron" },
  { name: "Active Goals", value: "5", icon: Target, href: "/goals" },
  { name: "Pending Todos", value: "8", icon: CheckSquare, href: "/todos" },
  { name: "Mission Queue", value: "2", icon: ListTodo, href: "/missions" },
];

export default function Dashboard() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Flame className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold text-white">JDub Dashboard</h1>
        </div>
        <p className="text-zinc-400">Your digital right-hand at a glance</p>
      </div>

      {/* Status Banner */}
      <Card className="mb-8 bg-gradient-to-r from-orange-500/20 to-zinc-900 border-orange-500/30">
        <CardContent className="flex items-center justify-between py-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20">
              <Zap className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">System Status</h2>
              <p className="text-zinc-400">All systems operational</p>
            </div>
          </div>
          <Badge variant="outline" className="border-green-500 text-green-500">
            Online
          </Badge>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  {stat.name}
                </CardTitle>
                <stat.icon className="w-5 h-5 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/chat">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer">
              <MessageSquare className="w-8 h-8 text-orange-500" />
              <span className="text-sm text-zinc-300">New Chat</span>
            </div>
          </Link>
          <Link href="/todos">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer">
              <CheckSquare className="w-8 h-8 text-orange-500" />
              <span className="text-sm text-zinc-300">Add Todo</span>
            </div>
          </Link>
          <Link href="/cron">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer">
              <Clock className="w-8 h-8 text-orange-500" />
              <span className="text-sm text-zinc-300">Schedule Task</span>
            </div>
          </Link>
          <Link href="/memory">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer">
              <Brain className="w-8 h-8 text-orange-500" />
              <span className="text-sm text-zinc-300">View Memory</span>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
