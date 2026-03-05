import { PageHero } from "@/components/page-hero";

const contactInfo = [
  { icon: "📧", label: "Email", value: "contact@reviewpurge.com" },
  { icon: "⏰", label: "Jam Respon", value: "Senin-Jumat, 09:00-18:00 WIB" },
  { icon: "📍", label: "Location", value: "Indonesia (Remote)" },
];

export default function ContactPage() {
  return (
    <div className="space-y-10">
      <PageHero
        kicker="Contact"
        title="Hubungi Tim ReviewPurge"
        description="Untuk partnership, feedback, atau koreksi konten, tim kami siap membantu."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Form */}
        <div className="panel p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Send Us a Message
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Isi form di bawah dan kami akan merespon via email.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                type="text"
                placeholder="Your name"
                className="input"
                readOnly
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                placeholder="you@email.com"
                className="input"
                readOnly
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Message
              </label>
              <textarea
                placeholder="Write your message..."
                rows={4}
                className="input resize-none"
                readOnly
              />
            </div>
            <button type="button" className="btn btn-primary w-full">
              Send Message
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          {contactInfo.map((item) => (
            <div key={item.label} className="glass-card flex items-start gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 text-xl">
                {item.icon}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {item.label}
                </p>
                <p className="mt-0.5 text-base font-semibold text-slate-900">
                  {item.value}
                </p>
              </div>
            </div>
          ))}

          <div className="glass-card overflow-hidden p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Partnership
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Tertarik menjadi advertiser atau sponsor di ReviewPurge?
              Hubungi kami untuk mendiskusikan peluang kolaborasi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
