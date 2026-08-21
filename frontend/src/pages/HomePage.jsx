import { motion } from "framer-motion";
import { ArrowRight, BadgeInfo, CalendarClock, ShieldCheck, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import GuestNavbar from "../components/layout/GuestNavbar";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import PageContainer from "../components/ui/PageContainer";
import { ROUTE_PATHS } from "../routes/routePaths";

function HomePage() {
  return (
    <div className="min-h-screen">
      <GuestNavbar />

      <PageContainer className="py-12 sm:py-16">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]"
        >
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300">
              <BadgeInfo className="h-3.5 w-3.5" />
              Multi-tenant SaaS foundation
            </span>

            <div className="space-y-5">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Host unforgettable events.
                <span className="block text-app-300">Sell tickets effortlessly.</span>
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                A modern event platform foundation for customers, organizers, managers, and super
                admins. Built with a clean onboarding experience, secure auth flows, and tenant-aware
                architecture.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button as={Link} to="/#featured-events">
                Browse Events
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button as={Link} to={ROUTE_PATHS.REGISTER_ORGANIZER} variant="secondary">
                Register as Organizer
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Ticket, title: "Ticket sales", text: "Fast booking experiences" },
                { icon: CalendarClock, title: "Event planning", text: "Simple organizer workflows" },
                { icon: ShieldCheck, title: "Secure access", text: "Role-aware authentication" },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <Card key={item.title} className="space-y-3 bg-slate-900/60">
                    <Icon className="h-5 w-5 text-app-300" />
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold text-white">{item.title}</h2>
                      <p className="text-xs leading-5 text-slate-400">{item.text}</p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          <Card className="relative overflow-hidden border-slate-800/70 bg-slate-900/80 p-0">
            <div className="absolute inset-0 bg-app-500/10" />
            <div className="relative space-y-5 p-6 sm:p-8">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-app-300">
                  Built for growth
                </p>
                <h2 className="text-2xl font-semibold text-white">Everything begins with the right foundation.</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-3xl font-semibold text-white">03</p>
                  <p className="mt-1 text-sm text-slate-400">Key auth flows ready</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-3xl font-semibold text-white">05</p>
                  <p className="mt-1 text-sm text-slate-400">User roles supported</p>
                </div>
              </div>

              <div id="featured-events" className="space-y-3">
                <h3 className="text-sm font-semibold text-white">Featured experiences</h3>
                <div className="space-y-3">
                  {[
                    "Live concerts and entertainment",
                    "Business conferences and summits",
                    "Community meetups and workshops",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </motion.section>
      </PageContainer>
    </div>
  );
}

export default HomePage;
