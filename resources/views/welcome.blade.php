<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EduPulse — The Precision School Command Center</title>
    <meta name="description" content="EduPulse is a premium multi-tenant LMS for Arabic and English schools. Every role, one intelligent platform.">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {
            --surface-deep:    oklch(14% 0.018 258);
            --surface-base:    oklch(17% 0.02 255);
            --surface-raised:  oklch(21% 0.022 255);
            --surface-high:    oklch(26% 0.022 255);
            --border:          oklch(32% 0.025 255);
            --border-sub:      oklch(22% 0.02 255);
            --blue:            oklch(62% 0.26 255);
            --blue-12:         oklch(62% 0.26 255 / 0.12);
            --blue-20:         oklch(62% 0.26 255 / 0.20);
            --amber:           oklch(75% 0.18 75);
            --amber-12:        oklch(75% 0.18 75 / 0.12);
            --green:           oklch(62% 0.2 155);
            --red:             oklch(55% 0.22 27);
            --text-1:          oklch(95% 0.01 255);
            --text-2:          oklch(63% 0.02 255);
            --text-3:          oklch(43% 0.02 255);
            --eq:              cubic-bezier(0.25, 1, 0.5, 1);
            --ex:              cubic-bezier(0.16, 1, 0.3, 1);
        }

        *, *::before, *::after { box-sizing: border-box; }

        html { scroll-behavior: smooth; }

        body {
            font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
            background: var(--surface-base);
            color: var(--text-1);
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
            margin: 0;
        }

        /* ── Reveal ── */
        .reveal {
            opacity: 0;
            transform: translateY(28px);
            transition: opacity 650ms var(--ex), transform 650ms var(--ex);
        }
        .reveal.in { opacity: 1; transform: none; }
        .rd1 { transition-delay: 80ms; }
        .rd2 { transition-delay: 160ms; }
        .rd3 { transition-delay: 240ms; }
        .rd4 { transition-delay: 320ms; }

        /* ── Nav ── */
        @keyframes navIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
        #nav {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            border-bottom: 1px solid transparent;
            transition: background 300ms var(--eq), border-color 300ms var(--eq), backdrop-filter 300ms;
            animation: navIn 480ms 60ms var(--ex) both;
        }
        #nav.scrolled {
            background: oklch(17% 0.02 255 / 0.92);
            border-color: var(--border-sub);
            backdrop-filter: blur(14px);
        }

        /* ── Buttons ── */
        .btn-p {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 11px 22px; border-radius: 8px;
            background: var(--blue); color: oklch(98% 0.005 255);
            font-family: inherit; font-weight: 600; font-size: 0.9375rem;
            border: none; cursor: pointer; text-decoration: none;
            transition: background 150ms var(--eq), transform 150ms var(--eq), box-shadow 150ms var(--eq);
        }
        .btn-p:hover  { background: oklch(67% 0.26 255); transform: translateY(-2px); box-shadow: 0 8px 24px oklch(62% 0.26 255 / 0.3); }
        .btn-p:active { transform: scale(0.97) !important; box-shadow: none; }
        .btn-p:focus-visible { outline: 2px solid var(--blue); outline-offset: 3px; }

        .btn-g {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 11px 22px; border-radius: 8px;
            background: transparent; color: var(--text-1);
            font-family: inherit; font-weight: 500; font-size: 0.9375rem;
            border: 1px solid var(--border); cursor: pointer; text-decoration: none;
            transition: background 150ms var(--eq), border-color 150ms var(--eq), transform 150ms var(--eq);
        }
        .btn-g:hover  { background: var(--surface-raised); border-color: oklch(42% 0.025 255); transform: translateY(-1px); }
        .btn-g:active { transform: scale(0.97) !important; }
        .btn-g:focus-visible { outline: 2px solid var(--blue); outline-offset: 3px; }

        /* ── Pill label ── */
        .pill {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 5px 12px; border-radius: 6px;
            font-size: 0.6875rem; font-weight: 600;
            letter-spacing: 0.06em; text-transform: uppercase;
        }

        /* ── Section titles ── */
        .kicker {
            font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em;
            text-transform: uppercase; color: var(--text-3); margin-bottom: 18px;
        }

        /* ── Feature tabs ── */
        .rtab {
            padding: 9px 20px; border-radius: 6px;
            font-family: inherit; font-size: 0.875rem; font-weight: 500;
            letter-spacing: 0.02em; cursor: pointer;
            border: 1px solid var(--border); color: var(--text-2);
            background: transparent;
            transition: color 150ms var(--eq), background 150ms var(--eq), border-color 150ms var(--eq);
        }
        .rtab:hover { color: var(--text-1); background: var(--surface-raised); }
        .rtab.active { background: var(--blue-12); border-color: var(--blue); color: var(--blue); }
        .rtab:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }

        .rpanel { display: none; }
        .rpanel.active { display: block; }

        /* ── Feature item ── */
        .fitem {
            display: flex; align-items: flex-start; gap: 14px;
            padding: 18px 0;
            border-bottom: 1px solid var(--border-sub);
        }
        .fitem:last-child { border-bottom: none; }
        .ficon {
            width: 34px; height: 34px; border-radius: 8px;
            background: var(--blue-12); flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
        }

        /* ── Mock dashboard ── */
        .mock {
            background: var(--surface-raised);
            border: 1px solid var(--border);
            border-radius: 12px; overflow: hidden;
        }
        .mock-bar {
            display: flex; align-items: center; gap: 6px;
            padding: 11px 14px;
            border-bottom: 1px solid var(--border-sub);
            background: oklch(19% 0.02 255);
        }
        .mock-dot { width: 9px; height: 9px; border-radius: 50%; }

        /* ── Testimonial ── */
        .tcard {
            background: var(--surface-raised);
            border: 1px solid var(--border-sub);
            border-radius: 12px; padding: 28px;
            transition: border-color 220ms var(--eq), transform 220ms var(--eq), box-shadow 220ms var(--eq);
        }
        .tcard:hover { border-color: var(--border); transform: translateY(-4px); box-shadow: 0 18px 56px oklch(0% 0 0 / 0.28); }

        /* ── Progress bar ── */
        .pbar { height: 3px; border-radius: 2px; background: var(--border-sub); overflow: hidden; }
        .pbar-fill { height: 100%; border-radius: 2px; transition: width 1.2s var(--ex); }

        /* ── Input ── */
        .inp {
            width: 100%; padding: 10px 14px;
            background: var(--surface-high);
            border: 1px solid var(--border);
            border-radius: 6px; font-family: inherit;
            font-size: 0.9375rem; color: var(--text-1);
            outline: none;
            transition: border-color 150ms var(--eq);
        }
        .inp:focus { border-color: var(--blue); box-shadow: 0 0 0 3px oklch(62% 0.26 255 / 0.14); }
        .inp::placeholder { color: var(--text-3); }

        /* ── Nav link hover ── */
        .nlink {
            font-size: 0.875rem; font-weight: 500;
            color: var(--text-2); text-decoration: none;
            transition: color 150ms;
        }
        .nlink:hover { color: var(--text-1); }

        /* ── Hero entrance system ── */
        .hero-el {
            opacity: 0; transform: translateY(22px);
            transition: opacity 580ms var(--ex), transform 580ms var(--ex);
        }
        .hero-el.in { opacity: 1; transform: none; }

        .hero-mock-el {
            opacity: 0; transform: translateX(44px);
            transition: opacity 750ms var(--ex), transform 750ms var(--ex);
        }
        .hero-mock-el.in { opacity: 1; transform: none; }

        .hw {
            display: inline-block; opacity: 0; transform: translateY(14px);
            transition: opacity 300ms var(--ex), transform 300ms var(--ex);
        }
        .hw.in { opacity: 1; transform: none; }

        /* ── Step connector draw ── */
        .scon {
            transform-origin: left; transform: scaleX(0);
            transition: transform 800ms 140ms var(--ex);
        }
        .reveal.in .scon { transform: scaleX(1); }

        /* ── Tab panel fade ── */
        @keyframes panelIn {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: none; }
        }
        .rpanel.entering { animation: panelIn 280ms var(--ex) both; }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
            #nav { animation: none; opacity: 1; transform: none; }
            .hero-el, .hero-mock-el, .hw { opacity: 1; transform: none; transition: none; }
            .scon { transform: scaleX(1); transition: none; }
            .reveal { opacity: 1; transform: none; transition: none; }
            *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }

        /* ── Responsive ── */
        @media (max-width: 960px) {
            .hero-grid { grid-template-columns: 1fr !important; }
            .hero-mock  { display: none !important; }
            .feat-grid  { grid-template-columns: 1fr !important; }
            .steps-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
            .test-grid  { grid-template-columns: 1fr !important; }
            .test-col2  { margin-top: 0 !important; }
            .foot-grid  { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 640px) {
            .nav-links  { display: none !important; }
            .hero-stats { flex-direction: column !important; gap: 20px !important; }
            .hero-stats .divider { display: none !important; }
            .foot-grid  { grid-template-columns: 1fr !important; }
        }
    </style>
</head>
<body>

<!-- ── Navigation ──────────────────────────────────────────── -->
<nav id="nav" role="navigation" aria-label="Main navigation">
    <div style="max-width:1180px;margin:0 auto;padding:0 24px">
        <div style="display:flex;align-items:center;height:64px;gap:40px">

            <a href="#" style="display:flex;align-items:center;gap:9px;text-decoration:none;flex-shrink:0">
                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                    <rect width="26" height="26" rx="6" fill="var(--blue)"/>
                    <circle cx="13" cy="13" r="2.5" fill="white"/>
                    <path d="M7.5 13h3M15.5 13h3M13 7.5v3M13 15.5v3" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
                <span style="font-size:1.0625rem;font-weight:700;color:var(--text-1);letter-spacing:-0.015em">EduPulse</span>
            </a>

            <div class="nav-links" style="display:flex;align-items:center;gap:32px;flex:1">
                <a class="nlink" href="#features">Platform</a>
                <a class="nlink" href="#how-it-works">How It Works</a>
                <a class="nlink" href="#testimonials">Schools</a>
            </div>

            <div style="margin-left:auto;flex-shrink:0">
                <a href="#contact" class="btn-p" style="padding:8px 18px;font-size:0.875rem">
                    Contact Sales
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M1.5 6.5h10M8 4l4 2.5L8 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </a>
            </div>

        </div>
    </div>
</nav>


<!-- ── Hero ────────────────────────────────────────────────── -->
<section style="position:relative;min-height:100vh;display:flex;align-items:center;overflow:hidden;background:var(--surface-deep)">
    <canvas id="hero-canvas" style="position:absolute;inset:0;pointer-events:none" aria-hidden="true"></canvas>

    <div style="max-width:1180px;margin:0 auto;padding:120px 24px 80px;width:100%;display:grid;grid-template-columns:1fr 460px;gap:72px;align-items:center" class="hero-grid">

        <!-- Left -->
        <div>
            <div class="pill hero-el" id="hero-pill" style="background:var(--blue-12);color:var(--blue);border:1px solid var(--blue-20);margin-bottom:28px">
                <span style="width:5px;height:5px;border-radius:50%;background:var(--blue);display:inline-block" aria-hidden="true"></span>
                School Management Platform
            </div>

            <h1 style="font-size:clamp(2.4rem,5.2vw,3.75rem);font-weight:700;line-height:1.15;letter-spacing:-0.028em;color:var(--text-1);margin:0 0 22px">
                <span class="hw">Run</span> <span class="hw">your</span> <span class="hw">school</span><br><span class="hw">with</span> <span class="hw" style="color:var(--blue)">precision.</span>
            </h1>

            <p class="hero-el" id="hero-sub" style="font-size:clamp(1rem,1.7vw,1.125rem);line-height:1.65;color:var(--text-2);max-width:460px;margin:0 0 36px">
                EduPulse centralises courses, grades, attendance, and analytics under one purpose-built command center — designed for Arabic and English schools from day one.
            </p>

            <div class="hero-el" id="hero-ctas" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                <a href="#contact" class="btn-p">
                    Contact Sales
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true"><path d="M2 7.5h11M9 5l4 2.5L9 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </a>
                <a href="#features" class="btn-g">Explore Platform</a>
            </div>

            <div class="hero-el hero-stats" id="hero-stats" style="display:flex;align-items:center;gap:28px;margin-top:56px;padding-top:36px;border-top:1px solid var(--border-sub)">
                <div>
                    <div style="font-size:1.625rem;font-weight:700;color:var(--text-1)">40+</div>
                    <div style="font-size:0.8125rem;color:var(--text-2);margin-top:3px">Schools onboarded</div>
                </div>
                <div class="divider" style="width:1px;height:32px;background:var(--border)"></div>
                <div>
                    <div style="font-size:1.625rem;font-weight:700;color:var(--text-1)">6 roles</div>
                    <div style="font-size:0.8125rem;color:var(--text-2);margin-top:3px">Purpose-built dashboards</div>
                </div>
                <div class="divider" style="width:1px;height:32px;background:var(--border)"></div>
                <div>
                    <div style="font-size:1.625rem;font-weight:700;color:var(--text-1)">AR + EN</div>
                    <div style="font-size:0.8125rem;color:var(--text-2);margin-top:3px">Native bilingual</div>
                </div>
            </div>
        </div>

        <!-- Right: dashboard mock -->
        <div class="mock hero-mock hero-mock-el" id="hero-mock" style="height:460px">
            <div class="mock-bar">
                <span class="mock-dot" style="background:oklch(55% 0.15 27)"></span>
                <span class="mock-dot" style="background:oklch(72% 0.18 75)"></span>
                <span class="mock-dot" style="background:oklch(62% 0.2 150)"></span>
                <span style="font-size:0.6875rem;color:var(--text-3);margin-left:8px">EduPulse — Manager Dashboard</span>
            </div>

            <div style="display:grid;grid-template-columns:152px 1fr;height:calc(100% - 43px)">
                <!-- Sidebar -->
                <div style="background:var(--surface-deep);border-right:1px solid var(--border-sub);padding:14px 10px;display:flex;flex-direction:column;gap:3px">
                    <div style="display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:6px;background:var(--blue-12);margin-bottom:6px">
                        <div style="width:14px;height:14px;border-radius:3px;background:var(--blue)" aria-hidden="true"></div>
                        <span style="font-size:0.75rem;font-weight:600;color:var(--blue)">Overview</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:6px">
                        <div style="width:14px;height:14px;border-radius:3px;background:var(--border)" aria-hidden="true"></div>
                        <span style="font-size:0.75rem;color:var(--text-3)">Courses</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:6px">
                        <div style="width:14px;height:14px;border-radius:3px;background:var(--border)" aria-hidden="true"></div>
                        <span style="font-size:0.75rem;color:var(--text-3)">Teachers</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:6px">
                        <div style="width:14px;height:14px;border-radius:3px;background:var(--border)" aria-hidden="true"></div>
                        <span style="font-size:0.75rem;color:var(--text-3)">Students</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:9px;padding:9px 10px;border-radius:6px">
                        <div style="width:14px;height:14px;border-radius:3px;background:var(--border)" aria-hidden="true"></div>
                        <span style="font-size:0.75rem;color:var(--text-3)">Reports</span>
                    </div>
                    <div style="margin-top:auto;padding:9px 10px;border-radius:6px;background:var(--amber-12);border:1px solid oklch(75% 0.18 75 / 0.22)">
                        <div style="font-size:0.6875rem;font-weight:600;color:var(--amber);letter-spacing:0.04em;text-transform:uppercase">3 Pending</div>
                        <div style="font-size:0.6875rem;color:var(--text-3);margin-top:2px">Approvals</div>
                    </div>
                </div>

                <!-- Main -->
                <div style="padding:16px;background:var(--surface-raised);overflow:hidden">
                    <div class="kicker" style="margin-bottom:10px">This Week</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
                        <div style="padding:12px;background:var(--surface-high);border-radius:8px;border:1px solid var(--border-sub)">
                            <div style="font-size:1.25rem;font-weight:700;color:var(--text-1)">94.2%</div>
                            <div style="font-size:0.6875rem;color:var(--text-3);margin-top:2px">Attendance</div>
                            <div class="pbar" style="margin-top:8px"><div class="pbar-fill" style="width:94.2%;background:var(--blue)"></div></div>
                        </div>
                        <div style="padding:12px;background:var(--surface-high);border-radius:8px;border:1px solid var(--border-sub)">
                            <div style="font-size:1.25rem;font-weight:700;color:var(--text-1)">847</div>
                            <div style="font-size:0.6875rem;color:var(--text-3);margin-top:2px">Students</div>
                            <div class="pbar" style="margin-top:8px"><div class="pbar-fill" style="width:85%;background:var(--green)"></div></div>
                        </div>
                    </div>
                    <div class="kicker" style="margin-bottom:8px">Recent Activity</div>
                    <div style="display:flex;flex-direction:column;gap:5px">
                        <div style="display:flex;align-items:center;gap:9px;padding:8px;background:var(--surface-high);border-radius:6px">
                            <span style="width:5px;height:5px;border-radius:50%;background:var(--blue);flex-shrink:0" aria-hidden="true"></span>
                            <span style="font-size:0.6875rem;color:var(--text-2)">Math 10A grades submitted</span>
                            <span style="font-size:0.625rem;color:var(--text-3);margin-left:auto">2m ago</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:9px;padding:8px;background:var(--surface-high);border-radius:6px">
                            <span style="width:5px;height:5px;border-radius:50%;background:var(--amber);flex-shrink:0" aria-hidden="true"></span>
                            <span style="font-size:0.6875rem;color:var(--text-2)">3 absences flagged — Grade 9B</span>
                            <span style="font-size:0.625rem;color:var(--text-3);margin-left:auto">7m ago</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:9px;padding:8px;background:var(--surface-high);border-radius:6px">
                            <span style="width:5px;height:5px;border-radius:50%;background:var(--green);flex-shrink:0" aria-hidden="true"></span>
                            <span style="font-size:0.6875rem;color:var(--text-2)">New enrollment: Chemistry 11B</span>
                            <span style="font-size:0.625rem;color:var(--text-3);margin-left:auto">14m ago</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</section>


<!-- ── Features ─────────────────────────────────────────────── -->
<section id="features" style="padding:112px 0;background:var(--surface-base)">
    <div style="max-width:1180px;margin:0 auto;padding:0 24px">

        <div class="reveal" style="max-width:540px;margin-bottom:56px">
            <div class="kicker">Built for every role</div>
            <h2 style="font-size:clamp(1.625rem,3.2vw,2.375rem);font-weight:700;line-height:1.15;letter-spacing:-0.02em;color:var(--text-1);margin:0 0 14px">
                Each person sees exactly what they need.
            </h2>
            <p style="font-size:1rem;line-height:1.65;color:var(--text-2);margin:0">
                EduPulse doesn't hand everyone the same screen. Managers oversee operations, teachers run their courses, students stay on track — each interface built for that specific job.
            </p>
        </div>

        <!-- Tabs -->
        <div class="reveal rd1" style="display:flex;gap:8px;margin-bottom:44px" role="tablist" aria-label="Role selection">
            <button class="rtab active" onclick="switchRole('manager')" role="tab" aria-selected="true" aria-controls="p-manager" id="t-manager">Manager</button>
            <button class="rtab" onclick="switchRole('teacher')" role="tab" aria-selected="false" aria-controls="p-teacher" id="t-teacher">Teacher</button>
            <button class="rtab" onclick="switchRole('student')" role="tab" aria-selected="false" aria-controls="p-student" id="t-student">Student</button>
        </div>

        <!-- Manager Panel -->
        <div id="p-manager" class="rpanel active reveal rd2" role="tabpanel" aria-labelledby="t-manager">
            <div class="feat-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start">
                <div>
                    <div class="fitem">
                        <div class="ficon">
                            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" fill="var(--blue)"/><rect x="10" y="1.5" width="5.5" height="5.5" rx="1.5" fill="var(--blue)" opacity=".5"/><rect x="1.5" y="10" width="5.5" height="5.5" rx="1.5" fill="var(--blue)" opacity=".5"/><rect x="10" y="10" width="5.5" height="5.5" rx="1.5" fill="var(--blue)" opacity=".25"/></svg>
                        </div>
                        <div>
                            <div style="font-size:0.9375rem;font-weight:600;color:var(--text-1);margin-bottom:5px">School-wide overview</div>
                            <div style="font-size:0.875rem;line-height:1.6;color:var(--text-2)">Every metric that matters — attendance rates, enrollment counts, pending approvals — surfaced before you ask for them.</div>
                        </div>
                    </div>
                    <div class="fitem">
                        <div class="ficon">
                            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M8.5 2v4M8.5 11v4M2 8.5h4M11 8.5h4" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round"/></svg>
                        </div>
                        <div>
                            <div style="font-size:0.9375rem;font-weight:600;color:var(--text-1);margin-bottom:5px">Teacher performance tracking</div>
                            <div style="font-size:0.875rem;line-height:1.6;color:var(--text-2)">Monitor submission rates, assignment coverage, and grade distributions per teacher — no manual reporting required.</div>
                        </div>
                    </div>
                    <div class="fitem">
                        <div class="ficon">
                            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M3 5h11M3 8.5h7M3 12h5" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round"/></svg>
                        </div>
                        <div>
                            <div style="font-size:0.9375rem;font-weight:600;color:var(--text-1);margin-bottom:5px">Approval workflows</div>
                            <div style="font-size:0.875rem;line-height:1.6;color:var(--text-2)">Enrollment changes, course additions, and access requests flow through a clear approval queue — no email threads.</div>
                        </div>
                    </div>
                    <div class="fitem">
                        <div class="ficon">
                            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" stroke="var(--blue)" stroke-width="1.5"/><path d="M8.5 5.5v3l2 1.5" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round"/></svg>
                        </div>
                        <div>
                            <div style="font-size:0.9375rem;font-weight:600;color:var(--text-1);margin-bottom:5px">Full tenant isolation</div>
                            <div style="font-size:0.875rem;line-height:1.6;color:var(--text-2)">Every school runs in its own isolated tenant. Data never crosses boundaries, even on shared infrastructure.</div>
                        </div>
                    </div>
                </div>
                <div class="mock" style="padding:22px">
                    <div class="kicker" style="margin-bottom:18px">School Health — Week 18</div>
                    <div style="display:flex;flex-direction:column;gap:15px;margin-bottom:22px">
                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                                <span style="font-size:0.8125rem;color:var(--text-2)">Attendance rate</span>
                                <span style="font-size:0.8125rem;font-weight:600;color:var(--text-1)">94.2%</span>
                            </div>
                            <div class="pbar"><div class="pbar-fill" style="width:94.2%;background:var(--blue)"></div></div>
                        </div>
                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                                <span style="font-size:0.8125rem;color:var(--text-2)">Assignment submission</span>
                                <span style="font-size:0.8125rem;font-weight:600;color:var(--text-1)">87.6%</span>
                            </div>
                            <div class="pbar"><div class="pbar-fill" style="width:87.6%;background:var(--blue)"></div></div>
                        </div>
                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                                <span style="font-size:0.8125rem;color:var(--text-2)">Grade completion</span>
                                <span style="font-size:0.8125rem;font-weight:600;color:var(--amber)">71.3%</span>
                            </div>
                            <div class="pbar"><div class="pbar-fill" style="width:71.3%;background:var(--amber)"></div></div>
                        </div>
                    </div>
                    <div style="padding-top:18px;border-top:1px solid var(--border-sub)">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
                            <span class="kicker" style="margin:0">Pending Approvals</span>
                            <span class="pill" style="background:var(--amber-12);color:var(--amber);border:1px solid oklch(75% 0.18 75 / 0.2);padding:3px 9px;font-size:0.625rem">3 items</span>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:5px">
                            <div style="font-size:0.8125rem;color:var(--text-2);padding:8px;background:var(--surface-high);border-radius:6px">Course enrollment — Chemistry 11B</div>
                            <div style="font-size:0.8125rem;color:var(--text-2);padding:8px;background:var(--surface-high);border-radius:6px">Teacher access update — Ms. Saleh</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Teacher Panel -->
        <div id="p-teacher" class="rpanel" role="tabpanel" aria-labelledby="t-teacher">
            <div class="feat-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start">
                <div>
                    <div class="fitem">
                        <div class="ficon">
                            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M3.5 13.5V5.5l5-3 5 3v8" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="6" y="8.5" width="5" height="5" rx="1" fill="var(--blue)" opacity=".4"/></svg>
                        </div>
                        <div>
                            <div style="font-size:0.9375rem;font-weight:600;color:var(--text-1);margin-bottom:5px">Course and module management</div>
                            <div style="font-size:0.875rem;line-height:1.6;color:var(--text-2)">Build structured course content, organise modules, set deadlines, and publish materials all from one place.</div>
                        </div>
                    </div>
                    <div class="fitem">
                        <div class="ficon">
                            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M2.5 11.5l4-4 3 3 5-6" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                        <div>
                            <div style="font-size:0.9375rem;font-weight:600;color:var(--text-1);margin-bottom:5px">Grade book with analytics</div>
                            <div style="font-size:0.875rem;line-height:1.6;color:var(--text-2)">Enter grades once, see class-wide distributions instantly. Surface at-risk students before they fall behind.</div>
                        </div>
                    </div>
                    <div class="fitem">
                        <div class="ficon">
                            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><rect x="2" y="4" width="13" height="9" rx="1.5" stroke="var(--blue)" stroke-width="1.5"/><path d="M2 7h13" stroke="var(--blue)" stroke-width="1.5"/></svg>
                        </div>
                        <div>
                            <div style="font-size:0.9375rem;font-weight:600;color:var(--text-1);margin-bottom:5px">Assignment creation and review</div>
                            <div style="font-size:0.875rem;line-height:1.6;color:var(--text-2)">Create timed assignments, track submission status per student, and provide feedback without leaving the platform.</div>
                        </div>
                    </div>
                    <div class="fitem">
                        <div class="ficon">
                            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" stroke="var(--blue)" stroke-width="1.5"/><path d="M8.5 5.5v3l2 1" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round"/></svg>
                        </div>
                        <div>
                            <div style="font-size:0.9375rem;font-weight:600;color:var(--text-1);margin-bottom:5px">Attendance tracking</div>
                            <div style="font-size:0.875rem;line-height:1.6;color:var(--text-2)">Mark attendance in under a minute, generate reports automatically, and flag patterns to administration.</div>
                        </div>
                    </div>
                </div>
                <div class="mock" style="padding:22px">
                    <div class="kicker" style="margin-bottom:14px">Mathematics 10A — Grade Book</div>
                    <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:0;margin-bottom:8px">
                        <span class="kicker" style="padding:5px 6px;margin:0">Student</span>
                        <span class="kicker" style="padding:5px 8px;text-align:center;margin:0">HW</span>
                        <span class="kicker" style="padding:5px 8px;text-align:center;margin:0">Mid</span>
                        <span class="kicker" style="padding:5px 8px;text-align:center;margin:0">Avg</span>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:2px">
                        <div style="display:grid;grid-template-columns:1fr auto auto auto;background:var(--surface-high);border-radius:6px">
                            <span style="font-size:0.8125rem;color:var(--text-2);padding:8px 8px">Layla Hassan</span>
                            <span style="font-size:0.8125rem;color:var(--text-1);padding:8px;text-align:center">95</span>
                            <span style="font-size:0.8125rem;color:var(--text-1);padding:8px;text-align:center">88</span>
                            <span style="font-size:0.8125rem;font-weight:600;color:var(--blue);padding:8px;text-align:center">91</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr auto auto auto;border-radius:6px">
                            <span style="font-size:0.8125rem;color:var(--text-2);padding:8px 8px">Omar Khalil</span>
                            <span style="font-size:0.8125rem;color:var(--text-1);padding:8px;text-align:center">72</span>
                            <span style="font-size:0.8125rem;color:var(--text-1);padding:8px;text-align:center">68</span>
                            <span style="font-size:0.8125rem;font-weight:600;color:var(--amber);padding:8px;text-align:center">70</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr auto auto auto;background:var(--surface-high);border-radius:6px">
                            <span style="font-size:0.8125rem;color:var(--text-2);padding:8px 8px">Sara Nour</span>
                            <span style="font-size:0.8125rem;color:var(--text-1);padding:8px;text-align:center">88</span>
                            <span style="font-size:0.8125rem;color:var(--text-1);padding:8px;text-align:center">94</span>
                            <span style="font-size:0.8125rem;font-weight:600;color:var(--blue);padding:8px;text-align:center">91</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr auto auto auto;border-radius:6px">
                            <span style="font-size:0.8125rem;color:var(--text-2);padding:8px 8px">Yusuf Mansour</span>
                            <span style="font-size:0.8125rem;color:var(--text-1);padding:8px;text-align:center">60</span>
                            <span style="font-size:0.8125rem;color:var(--text-1);padding:8px;text-align:center">—</span>
                            <span style="font-size:0.8125rem;font-weight:600;color:var(--red);padding:8px;text-align:center">⚠</span>
                        </div>
                    </div>
                    <div style="margin-top:14px;padding:10px;background:oklch(55% 0.22 27 / 0.07);border:1px solid oklch(55% 0.22 27 / 0.18);border-radius:6px">
                        <div style="font-size:0.75rem;color:oklch(70% 0.15 27)">1 student has a missing midterm. Review before Friday's deadline.</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Student Panel -->
        <div id="p-student" class="rpanel" role="tabpanel" aria-labelledby="t-student">
            <div class="feat-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start">
                <div>
                    <div class="fitem">
                        <div class="ficon">
                            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><rect x="3" y="2" width="11" height="13" rx="1.5" stroke="var(--blue)" stroke-width="1.5"/><path d="M5.5 6h6M5.5 9h6M5.5 12h4" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round"/></svg>
                        </div>
                        <div>
                            <div style="font-size:0.9375rem;font-weight:600;color:var(--text-1);margin-bottom:5px">Course materials and schedule</div>
                            <div style="font-size:0.875rem;line-height:1.6;color:var(--text-2)">Access all enrolled course materials, lecture notes, and the weekly schedule in one clear timeline view.</div>
                        </div>
                    </div>
                    <div class="fitem">
                        <div class="ficon">
                            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M4.5 8.5l3 3 5-5" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                        <div>
                            <div style="font-size:0.9375rem;font-weight:600;color:var(--text-1);margin-bottom:5px">Assignment submission</div>
                            <div style="font-size:0.875rem;line-height:1.6;color:var(--text-2)">Submit work directly through the platform. Track what's submitted, what's pending, and what's overdue at a glance.</div>
                        </div>
                    </div>
                    <div class="fitem">
                        <div class="ficon">
                            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><circle cx="8.5" cy="8.5" r="6" stroke="var(--blue)" stroke-width="1.5"/><path d="M8.5 5.5v3l3.5 2" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round"/></svg>
                        </div>
                        <div>
                            <div style="font-size:0.9375rem;font-weight:600;color:var(--text-1);margin-bottom:5px">Deadline visibility</div>
                            <div style="font-size:0.875rem;line-height:1.6;color:var(--text-2)">Upcoming deadlines are sorted by urgency in your dashboard with clear countdowns. Nothing is buried.</div>
                        </div>
                    </div>
                    <div class="fitem">
                        <div class="ficon">
                            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M2.5 11.5l4-4 3 3 5-6" stroke="var(--blue)" stroke-width="1.5" stroke-linecap="round"/></svg>
                        </div>
                        <div>
                            <div style="font-size:0.9375rem;font-weight:600;color:var(--text-1);margin-bottom:5px">Grades and progress</div>
                            <div style="font-size:0.875rem;line-height:1.6;color:var(--text-2)">View grades per assignment, per course, and overall. Understand where you stand without waiting for a report card.</div>
                        </div>
                    </div>
                </div>
                <div class="mock" style="padding:22px">
                    <div class="kicker" style="margin-bottom:14px">Your Week — Upcoming</div>
                    <div style="display:flex;flex-direction:column;gap:8px">
                        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--amber-12);border:1px solid oklch(75% 0.18 75 / 0.22);border-radius:8px">
                            <div style="text-align:center;flex-shrink:0">
                                <div style="font-size:1.125rem;font-weight:700;color:var(--amber);line-height:1">2</div>
                                <div style="font-size:0.625rem;color:var(--text-3)">days</div>
                            </div>
                            <div>
                                <div style="font-size:0.875rem;font-weight:600;color:var(--text-1)">Physics — Chapter 4</div>
                                <div style="font-size:0.75rem;color:var(--text-3);margin-top:2px">Due Monday, 19 May</div>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--surface-high);border:1px solid var(--border-sub);border-radius:8px">
                            <div style="text-align:center;flex-shrink:0">
                                <div style="font-size:1.125rem;font-weight:700;color:var(--text-2);line-height:1">5</div>
                                <div style="font-size:0.625rem;color:var(--text-3)">days</div>
                            </div>
                            <div>
                                <div style="font-size:0.875rem;font-weight:600;color:var(--text-1)">Mathematics — Midterm Exam</div>
                                <div style="font-size:0.75rem;color:var(--text-3);margin-top:2px">Due Thursday, 22 May</div>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--surface-high);border:1px solid var(--border-sub);border-radius:8px">
                            <div style="text-align:center;flex-shrink:0">
                                <div style="font-size:1.125rem;font-weight:700;color:var(--text-2);line-height:1">8</div>
                                <div style="font-size:0.625rem;color:var(--text-3)">days</div>
                            </div>
                            <div>
                                <div style="font-size:0.875rem;font-weight:600;color:var(--text-1)">Arabic Literature — Essay</div>
                                <div style="font-size:0.75rem;color:var(--text-3);margin-top:2px">Due Sunday, 25 May</div>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border-sub);display:flex;justify-content:space-between;align-items:center">
                        <span style="font-size:0.8125rem;color:var(--text-2)">On-time submissions this month</span>
                        <span style="font-size:0.875rem;font-weight:600;color:var(--blue)">11 / 13</span>
                    </div>
                </div>
            </div>
        </div>

    </div>
</section>


<!-- ── How It Works ─────────────────────────────────────────── -->
<section id="how-it-works" style="padding:112px 0;background:var(--surface-deep)">
    <div style="max-width:1180px;margin:0 auto;padding:0 24px">

        <div class="reveal" style="max-width:460px;margin-bottom:72px">
            <div class="kicker">How it works</div>
            <h2 style="font-size:clamp(1.625rem,3.2vw,2.375rem);font-weight:700;line-height:1.15;letter-spacing:-0.02em;color:var(--text-1);margin:0">
                From setup to fully operational in days.
            </h2>
        </div>

        <div class="steps-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:48px">
            <div class="reveal">
                <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px">
                    <div style="width:46px;height:46px;border-radius:11px;background:var(--blue);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:oklch(98% 0.005 255);flex-shrink:0;letter-spacing:-0.01em">01</div>
                    <div class="scon" style="flex:1;height:1px;background:linear-gradient(90deg,var(--blue) 0%,var(--border-sub) 100%)"></div>
                </div>
                <h3 style="font-size:1.1875rem;font-weight:600;color:var(--text-1);margin:0 0 10px">Onboard your school</h3>
                <p style="font-size:0.9375rem;line-height:1.65;color:var(--text-2);margin:0">Your school gets its own isolated tenant in under an hour. Import rosters, configure the academic calendar, and set your curriculum structure.</p>
            </div>
            <div class="reveal rd1">
                <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px">
                    <div style="width:46px;height:46px;border-radius:11px;background:var(--surface-raised);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:var(--text-2);flex-shrink:0;letter-spacing:-0.01em">02</div>
                    <div class="scon" style="flex:1;height:1px;background:linear-gradient(90deg,var(--border) 0%,var(--border-sub) 100%)"></div>
                </div>
                <h3 style="font-size:1.1875rem;font-weight:600;color:var(--text-1);margin:0 0 10px">Assign roles and access</h3>
                <p style="font-size:0.9375rem;line-height:1.65;color:var(--text-2);margin:0">Every user gets a role-scoped experience. Managers see operations, teachers see their courses, students see their assignments. Permissions are enforced automatically.</p>
            </div>
            <div class="reveal rd2">
                <div style="display:flex;align-items:center;gap:16px;margin-bottom:28px">
                    <div style="width:46px;height:46px;border-radius:11px;background:var(--surface-raised);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:var(--text-2);flex-shrink:0;letter-spacing:-0.01em">03</div>
                    <div class="scon" style="flex:1;height:1px;background:var(--border-sub)"></div>
                </div>
                <h3 style="font-size:1.1875rem;font-weight:600;color:var(--text-1);margin:0 0 10px">Operate with precision</h3>
                <p style="font-size:0.9375rem;line-height:1.65;color:var(--text-2);margin:0">Every assignment, grade, attendance record, and approval flows through the platform from day one. Your school runs on data you can trust.</p>
            </div>
        </div>

    </div>
</section>


<!-- ── Testimonials ─────────────────────────────────────────── -->
<section id="testimonials" style="padding:112px 0;background:var(--surface-base)">
    <div style="max-width:1180px;margin:0 auto;padding:0 24px">

        <div class="reveal" style="margin-bottom:56px">
            <div class="kicker">Schools that run on EduPulse</div>
            <h2 style="font-size:clamp(1.625rem,3.2vw,2.375rem);font-weight:700;line-height:1.15;letter-spacing:-0.02em;color:var(--text-1);margin:0">
                From the people running their schools.
            </h2>
        </div>

        <div class="test-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:start">
            <div style="display:flex;flex-direction:column;gap:22px">
                <article class="tcard reveal">
                    <div style="font-size:1.75rem;color:var(--blue);line-height:1;margin-bottom:14px" aria-hidden="true">"</div>
                    <p style="font-size:1rem;line-height:1.7;color:var(--text-1);margin:0 0 22px;font-weight:400">After ten years on Moodle, the migration took a weekend. The manager dashboard now tells me what I need to know before I even think to ask for it. The difference in daily operational clarity is not incremental — it's categorical.</p>
                    <div style="display:flex;align-items:center;gap:13px">
                        <div style="width:38px;height:38px;border-radius:50%;background:var(--blue-12);border:1px solid var(--blue-20);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8125rem;color:var(--blue);flex-shrink:0" aria-hidden="true">SA</div>
                        <div>
                            <div style="font-size:0.875rem;font-weight:600;color:var(--text-1)">Dr. Sarah Al-Mansouri</div>
                            <div style="font-size:0.8125rem;color:var(--text-2)">Principal — Al-Nour International School</div>
                        </div>
                    </div>
                </article>
                <article class="tcard reveal rd1">
                    <div style="font-size:1.75rem;color:var(--blue);line-height:1;margin-bottom:14px" aria-hidden="true">"</div>
                    <p style="font-size:1rem;line-height:1.7;color:var(--text-1);margin:0 0 22px">The bilingual interface was the deciding factor. Arabic-speaking parents engage with the platform with the same confidence as English-speaking ones. That equality of experience is something we couldn't have built ourselves.</p>
                    <div style="display:flex;align-items:center;gap:13px">
                        <div style="width:38px;height:38px;border-radius:50%;background:var(--amber-12);border:1px solid oklch(75% 0.18 75 / 0.22);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8125rem;color:var(--amber);flex-shrink:0" aria-hidden="true">LH</div>
                        <div>
                            <div style="font-size:0.875rem;font-weight:600;color:var(--text-1)">Lina Haddad</div>
                            <div style="font-size:0.8125rem;color:var(--text-2)">IT Director — Phoenix Academy Beirut</div>
                        </div>
                    </div>
                </article>
            </div>
            <div class="test-col2" style="margin-top:48px">
                <article class="tcard reveal rd2">
                    <div style="font-size:1.75rem;color:var(--blue);line-height:1;margin-bottom:14px" aria-hidden="true">"</div>
                    <p style="font-size:1rem;line-height:1.7;color:var(--text-1);margin:0 0 22px">Our teachers went from managing three separate tools to one. Assignment submission rates went up by 40% in the first term, and grade reporting that used to take half a week now takes an afternoon.</p>
                    <div style="display:flex;align-items:center;gap:13px">
                        <div style="width:38px;height:38px;border-radius:50%;background:var(--blue-12);border:1px solid var(--blue-20);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8125rem;color:var(--blue);flex-shrink:0" aria-hidden="true">AK</div>
                        <div>
                            <div style="font-size:0.875rem;font-weight:600;color:var(--text-1)">Ahmed Khalil</div>
                            <div style="font-size:0.8125rem;color:var(--text-2)">Academic Director — Oasis Academy</div>
                        </div>
                    </div>
                </article>
            </div>
        </div>

    </div>
</section>


<!-- ── Contact CTA ──────────────────────────────────────────── -->
<section id="contact" style="padding:112px 0;background:var(--surface-deep)">
    <div style="max-width:1180px;margin:0 auto;padding:0 24px">
        <div style="max-width:680px;margin:0 auto;text-align:center">
            <div class="reveal">
                <h2 style="font-size:clamp(1.875rem,3.8vw,2.875rem);font-weight:700;line-height:1.1;letter-spacing:-0.025em;color:var(--text-1);margin:0 0 18px">
                    Ready to upgrade how your school operates?
                </h2>
                <p style="font-size:1.0625rem;line-height:1.65;color:var(--text-2);max-width:440px;margin:0 auto 44px">
                    Talk to the EduPulse team. We'll walk you through the platform and scope an onboarding plan for your school.
                </p>
            </div>
            <div class="reveal rd1" style="background:var(--surface-raised);border:1px solid var(--border);border-radius:16px;padding:36px;max-width:420px;margin:0 auto">
                <form id="contact-form" onsubmit="handleSubmit(event)" novalidate>
                    <div style="margin-bottom:14px;text-align:left">
                        <label for="c-name" style="display:block;font-size:0.8125rem;font-weight:500;color:var(--text-2);margin-bottom:5px">Full name</label>
                        <input id="c-name" class="inp" type="text" required placeholder="Your name" autocomplete="name">
                    </div>
                    <div style="margin-bottom:14px;text-align:left">
                        <label for="c-email" style="display:block;font-size:0.8125rem;font-weight:500;color:var(--text-2);margin-bottom:5px">Work email</label>
                        <input id="c-email" class="inp" type="email" required placeholder="you@yourschool.com" autocomplete="email">
                    </div>
                    <div style="margin-bottom:22px;text-align:left">
                        <label for="c-school" style="display:block;font-size:0.8125rem;font-weight:500;color:var(--text-2);margin-bottom:5px">School name</label>
                        <input id="c-school" class="inp" type="text" required placeholder="e.g. Oasis Academy" autocomplete="organization">
                    </div>
                    <button type="submit" class="btn-p" style="width:100%;justify-content:center">
                        Request a conversation
                    </button>
                </form>
                <p id="contact-success" style="display:none;font-size:0.9375rem;color:var(--green);text-align:center;padding:8px 0">
                    Thank you. We'll be in touch within one business day.
                </p>
            </div>
        </div>
    </div>
</section>


<!-- ── Footer ───────────────────────────────────────────────── -->
<footer style="padding:56px 0 28px;background:var(--surface-deep);border-top:1px solid var(--border-sub)">
    <div style="max-width:1180px;margin:0 auto;padding:0 24px">
        <div class="foot-grid" style="display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:48px;margin-bottom:44px">
            <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
                    <svg width="22" height="22" viewBox="0 0 26 26" fill="none" aria-hidden="true"><rect width="26" height="26" rx="6" fill="var(--blue)"/><circle cx="13" cy="13" r="2.5" fill="white"/><path d="M7.5 13h3M15.5 13h3M13 7.5v3M13 15.5v3" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>
                    <span style="font-size:0.9375rem;font-weight:700;color:var(--text-1)">EduPulse</span>
                </div>
                <p style="font-size:0.875rem;line-height:1.65;color:var(--text-2);max-width:200px;margin:0">Premium school management platform for Arabic and English institutions.</p>
            </div>
            <div>
                <div class="kicker" style="margin-bottom:14px">Platform</div>
                <div style="display:flex;flex-direction:column;gap:10px">
                    <a class="nlink" href="#features">For Managers</a>
                    <a class="nlink" href="#features">For Teachers</a>
                    <a class="nlink" href="#features">For Students</a>
                </div>
            </div>
            <div>
                <div class="kicker" style="margin-bottom:14px">Company</div>
                <div style="display:flex;flex-direction:column;gap:10px">
                    <a class="nlink" href="#">About</a>
                    <a class="nlink" href="#testimonials">Schools</a>
                    <a class="nlink" href="#contact">Contact</a>
                </div>
            </div>
            <div>
                <div class="kicker" style="margin-bottom:14px">Languages</div>
                <div style="display:flex;flex-direction:column;gap:10px">
                    <span style="font-size:0.875rem;color:var(--text-2)">English</span>
                    <span style="font-size:0.875rem;color:var(--text-2)">العربية</span>
                </div>
            </div>
        </div>
        <div style="padding-top:20px;border-top:1px solid var(--border-sub);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
            <span style="font-size:0.8125rem;color:var(--text-3)">© 2026 EduPulse. All rights reserved.</span>
            <div style="display:flex;gap:22px">
                <a href="#" style="font-size:0.8125rem;color:var(--text-3);text-decoration:none;transition:color 150ms" onmouseover="this.style.color='var(--text-2)'" onmouseout="this.style.color='var(--text-3)'">Privacy</a>
                <a href="#" style="font-size:0.8125rem;color:var(--text-3);text-decoration:none;transition:color 150ms" onmouseover="this.style.color='var(--text-2)'" onmouseout="this.style.color='var(--text-3)'">Terms</a>
            </div>
        </div>
    </div>
</footer>


<script>
(function () {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* ── Nav scroll ── */
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 16);
    }, { passive: true });

    /* ── Hero entrance sequence ── */
    function heroEntrance() {
        const fire = (id, delay) => setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.classList.add('in');
        }, delay);

        fire('hero-pill',  80);
        fire('hero-mock', 220);
        fire('hero-sub',  500);
        fire('hero-ctas', 600);
        fire('hero-stats',720);

        document.querySelectorAll('.hw').forEach((w, i) => {
            setTimeout(() => w.classList.add('in'), 180 + i * 65);
        });
    }

    if (mq.matches) {
        ['hero-pill','hero-mock','hero-sub','hero-ctas','hero-stats'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('in');
        });
        document.querySelectorAll('.hw').forEach(w => w.classList.add('in'));
    } else {
        heroEntrance();
    }

    /* ── Hero canvas ── */
    if (!mq.matches) {
        const canvas = document.getElementById('hero-canvas');
        const ctx = canvas.getContext('2d');
        const BLUE = [65, 115, 255];
        const GAP = 68;
        let W, H, cols, rows, dots;

        function build() {
            W = canvas.width = canvas.offsetWidth;
            H = canvas.height = canvas.offsetHeight;
            cols = Math.ceil(W / GAP) + 1;
            rows = Math.ceil(H / GAP) + 1;
            dots = [];
            for (let r = 0; r <= rows; r++) {
                for (let c = 0; c <= cols; c++) {
                    dots.push({ x: c*GAP, y: r*GAP, r, c,
                        ph: Math.random() * Math.PI * 2,
                        sp: 0.28 + Math.random() * 0.38 });
                }
            }
        }

        function idx(r, c) { return r * (cols + 1) + c; }

        let t = 0;
        function draw() {
            ctx.clearRect(0, 0, W, H);
            t += 0.003;
            dots.forEach(d => {
                const p  = Math.sin(t * d.sp + d.ph) * 0.5 + 0.5;
                const a  = p * 0.22 + 0.03;
                ctx.beginPath();
                ctx.arc(d.x, d.y, 1.4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${BLUE[0]},${BLUE[1]},${BLUE[2]},${a.toFixed(3)})`;
                ctx.fill();
                if (d.c < cols) {
                    const nb = dots[idx(d.r, d.c + 1)];
                    const pA = Math.sin(t * d.sp + d.ph) * 0.5 + 0.5;
                    const pB = Math.sin(t * nb.sp + nb.ph) * 0.5 + 0.5;
                    const la = ((pA + pB) / 2) * 0.07;
                    ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(nb.x, nb.y);
                    ctx.strokeStyle = `rgba(${BLUE[0]},${BLUE[1]},${BLUE[2]},${la.toFixed(3)})`;
                    ctx.lineWidth = 1; ctx.stroke();
                }
                if (d.r < rows) {
                    const nb = dots[idx(d.r + 1, d.c)];
                    const pA = Math.sin(t * d.sp + d.ph) * 0.5 + 0.5;
                    const pB = Math.sin(t * nb.sp + nb.ph) * 0.5 + 0.5;
                    const la = ((pA + pB) / 2) * 0.07;
                    ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(nb.x, nb.y);
                    ctx.strokeStyle = `rgba(${BLUE[0]},${BLUE[1]},${BLUE[2]},${la.toFixed(3)})`;
                    ctx.lineWidth = 1; ctx.stroke();
                }
            });
            requestAnimationFrame(draw);
        }

        build();
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(build, 120);
        });
        draw();
    }

    /* ── Scroll reveal ── */
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

    /* ── Role tabs ── */
    window.switchRole = function(role) {
        document.querySelectorAll('.rtab').forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });
        const panels = document.querySelectorAll('.rpanel');
        panels.forEach(p => {
            p.classList.remove('active', 'entering');
        });
        const tab   = document.getElementById('t-' + role);
        const panel = document.getElementById('p-' + role);
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        panel.classList.add('active', 'entering');
        panel.addEventListener('animationend', () => panel.classList.remove('entering'), { once: true });
    };

    /* ── Contact form ── */
    window.handleSubmit = function(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.textContent = 'Sending…';
        btn.disabled = true;
        setTimeout(() => {
            document.getElementById('contact-form').style.display = 'none';
            document.getElementById('contact-success').style.display = 'block';
        }, 900);
    };
})();
</script>
</body>
</html>
