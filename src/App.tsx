import { useEffect, useState } from "react";
import {
  Menu, X, Moon, Sun, LogIn, LogOut, Shield, FileText, Car, Gavel, ScrollText, LayoutDashboard,
  Upload, Download, Trash2, Edit3, Save, Search, KeyRound, Settings, Users, Eye
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from "recharts";

/**
 * HR Portal — GitHub Pages friendly (Frontend only)
 * - Top navigation appears AFTER login.
 * - Permissions are selectable via checkboxes in Admin panel.
 * - Mobile responsive, modern glassmorphism + brand colors.
 */

type Role = "admin" | "manager" | "staff";
type User = { id: string; username: string; password: string; role: Role; permissions: string[] };
type Employee = { id: string; name: string; dept?: string; phone?: string; joinDate?: string };
type Fine = { id: string; employeeId: string; amount: number; reason: string; date: string };
type Vehicle = { id: string; plate: string; model?: string; assignedTo?: string };
type Evaluation = { id: string; employeeId: string; score: number; notes?: string; date: string };
type Contract = { id: string; employeeId: string; start: string; end?: string; title?: string };
type AppData = {
  employees: Employee[]; fines: Fine[]; vehicles: Vehicle[]; evaluations: Evaluation[]; contracts: Contract[]; instructions: string;
};

const PERMISSIONS = [
  "dashboard:view","employees:view","employees:edit","fines:view","fines:edit",
  "vehicles:view","vehicles:edit","evaluations:view","evaluations:edit",
  "contracts:view","contracts:edit","instructions:view","instructions:edit","admin:panel"
];

const LS_KEYS = { USERS: "app_users", AUTH: "app_auth_user", DATA: "app_data" };

function cryptoId(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function loadLS<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } }
function saveLS<T>(key: string, value: T){ localStorage.setItem(key, JSON.stringify(value)); }
function hasPerm(user: User | null, perm: string){ if(!user) return false; return user.permissions.includes("*") || user.permissions.includes(perm); }

const DEFAULT_USERS: User[] = [
  { id: cryptoId(), username: "admin", password: "admin", role: "admin", permissions: ["*"] },
  { id: cryptoId(), username: "onlyeval", password: "123", role: "staff", permissions: ["evaluations:view"] },
  { id: cryptoId(), username: "onlyfine", password: "123", role: "staff", permissions: ["fines:view"] },
];

const DEFAULT_DATA: AppData = {
  employees: [
    { id: cryptoId(), name: "أحمد علي", dept: "الصيانة", phone: "07xxxxxxxx", joinDate: "2024-02-01" },
    { id: cryptoId(), name: "سارة محمد", dept: "الدعم", phone: "07xxxxxxxx", joinDate: "2024-05-15" },
  ],
  fines: [],
  vehicles: [ { id: cryptoId(), plate: "ع ب 12345", model: "هايلوكس" } ],
  evaluations: [],
  contracts: [],
  instructions: "- الالتزام بالزي الرسمي\n- احترام أوقات العمل\n- اتباع تعليمات السلامة",
};

export default function App(){
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState<string>("login");

  const [users, setUsers] = useState<User[]>(() => loadLS(LS_KEYS.USERS, DEFAULT_USERS));
  const [auth, setAuth] = useState<User | null>(() => loadLS(LS_KEYS.AUTH, null as any));
  const [data, setData] = useState<AppData>(() => loadLS(LS_KEYS.DATA, DEFAULT_DATA));

  useEffect(()=>{ saveLS(LS_KEYS.USERS, users); }, [users]);
  useEffect(()=>{ saveLS(LS_KEYS.AUTH, auth); }, [auth]);
  useEffect(()=>{ saveLS(LS_KEYS.DATA, data); }, [data]);

  function go(next: string){
    if(!auth){ setPage("login"); setOpen(false); return; }
    setPage(next); setOpen(false);
  }

  // Self-tests (do not modify unless wrong)
  useEffect(()=>{
    try {
      const a = cryptoId(), b = cryptoId();
      console.log("[TEST] crypto unique:", a !== b);
      console.log("[TEST] admin has *:", hasPerm(DEFAULT_USERS[0], "employees:edit"));
      console.log("[TEST] instructions lines >=3:", DEFAULT_DATA.instructions.split("\n").length >= 3);
      const evUser = DEFAULT_USERS[1], fiUser = DEFAULT_USERS[2];
      console.log("[TEST] onlyeval perms:", evUser.permissions.includes("evaluations:view") && !evUser.permissions.includes("fines:view"));
      console.log("[TEST] onlyfine perms:", fiUser.permissions.includes("fines:view") && !fiUser.permissions.includes("evaluations:view"));
      console.log("[TEST] access(evaluations) for onlyeval:", hasPerm(evUser as any, "evaluations:view"));
      console.log("[TEST] access(fines) for onlyeval:", hasPerm(evUser as any, "fines:view") === false);
      console.log("[TEST] access(fines) for onlyfine:", hasPerm(fiUser as any, "fines:view"));
      console.log("[TEST] access(evaluations) for onlyfine:", hasPerm(fiUser as any, "evaluations:view") === false);
    } catch(err){ console.warn("[TEST] failed", err); }
  }, []);

  return (
    <div dir="rtl" className={dark? "dark": ""}>
      <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
        <TopBar dark={dark} setDark={setDark} open={open} setOpen={setOpen} auth={auth} go={go} setAuth={setAuth} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          {!auth && page === "login" && <Login onLogin={(u)=>{ setAuth(u); setPage("dashboard"); }} users={users} />}
          {auth && (
            <main>
              {page === "dashboard" && hasPerm(auth, "dashboard:view") && <Dashboard data={data} />}
              {page === "employees" && hasPerm(auth, "employees:view") && <Employees data={data} setData={setData} canEdit={hasPerm(auth, "employees:edit")} />}
              {page === "fines" && hasPerm(auth, "fines:view") && <Fines data={data} setData={setData} canEdit={hasPerm(auth, "fines:edit")} />}
              {page === "vehicles" && hasPerm(auth, "vehicles:view") && <Vehicles data={data} setData={setData} canEdit={hasPerm(auth, "vehicles:edit")} />}
              {page === "evaluations" && hasPerm(auth, "evaluations:view") && <Evaluations data={data} setData={setData} canEdit={hasPerm(auth, "evaluations:edit")} />}
              {page === "contracts" && hasPerm(auth, "contracts:view") && <Contracts data={data} setData={setData} canEdit={hasPerm(auth, "contracts:edit")} />}
              {page === "instructions" && hasPerm(auth, "instructions:view") && <Instructions data={data} setData={setData} canEdit={hasPerm(auth, "instructions:edit")} />}
              {page === "admin" && hasPerm(auth, "admin:panel") && <Admin users={users} setUsers={setUsers} currentUser={auth} />}
              {page !== "login" && !hasPageAccess(auth, page) && (<Guard />)}
            </main>
          )}
        </div>
        <Footer />
      </div>
    </div>
  );
}

function hasPageAccess(user: User | null, p: string){
  const MAP: Record<string,string> = {
    dashboard: "dashboard:view",
    employees: "employees:view",
    fines: "fines:view",
    vehicles: "vehicles:view",
    evaluations: "evaluations:view",
    contracts: "contracts:view",
    instructions: "instructions:view",
    admin: "admin:panel",
  };
  const need = MAP[p];
  if(!need) return true;
  return hasPerm(user, need);
}

// ===== Top Bar =====
function TopBar({ dark, setDark, open, setOpen, auth, go, setAuth }:{
  dark:boolean; setDark:(v:any)=>void; open:boolean; setOpen:(v:any)=>void; auth:User|null; go:(p:string)=>void; setAuth:(u:User|null)=>void;
}){
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-[var(--glass-bg)] dark:bg-[var(--glass-dark)] backdrop-blur shadow-glass">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-brand-600 text-white grid place-items-center font-bold">م</div>
            <div>
              <div className="text-lg font-semibold tracking-tight">منظومة الموارد</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">إدارة موظفين وغرامات ومركبات وتقييمات وعقود</div>
            </div>
          </div>

          {/* Top links (after login) */}
          <div className="hidden md:flex items-center gap-2">
            {auth && (
              <div className="flex items-center gap-1">
                {hasPerm(auth, "dashboard:view") && <TopLink onClick={()=>go("dashboard")}>الداشبورد</TopLink>}
                {hasPerm(auth, "employees:view") && <TopLink onClick={()=>go("employees")} icon={<Users size={14}/>}>الموظفون</TopLink>}
                {hasPerm(auth, "fines:view") && <TopLink onClick={()=>go("fines")} icon={<Gavel size={14}/>}>الغرامات</TopLink>}
                {hasPerm(auth, "vehicles:view") && <TopLink onClick={()=>go("vehicles")} icon={<Car size={14}/>}>المركبات</TopLink>}
                {hasPerm(auth, "evaluations:view") && <TopLink onClick={()=>go("evaluations")} icon={<Eye size={14}/>}>التقييمات</TopLink>}
                {hasPerm(auth, "contracts:view") && <TopLink onClick={()=>go("contracts")} icon={<FileText size={14}/>}>العقود</TopLink>}
                {hasPerm(auth, "instructions:view") && <TopLink onClick={()=>go("instructions")} icon={<ScrollText size={14}/>}>التعليمات</TopLink>}
                {hasPerm(auth, "admin:panel") && <TopLink onClick={()=>go("admin")} icon={<Shield size={14}/>}>المسؤول</TopLink>}
              </div>
            )}

            <button onClick={()=>setDark((d:boolean)=>!d)} className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-900" aria-label="mode">
              {dark ? <Sun size={16} /> : <Moon size={16} />} <span>{dark? "فاتح":"داكن"}</span>
            </button>

            {auth ? (
              <button onClick={()=>{ setAuth(null); }} className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-900">
                <LogOut size={16} /> خروج
              </button>
            ) : (
              <button className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 opacity-60 cursor-not-allowed">
                <LogIn size={16} /> دخول
              </button>
            )}
          </div>

          {/* Mobile */}
          <button onClick={()=>setOpen(!open)} className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {/* Drawer Mobile */}
        {open && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 py-2">
            {auth && (
              <div className="flex flex-col py-2 gap-1">
                {hasPerm(auth, "dashboard:view") && <MobileLink onClick={()=>go("dashboard")}>الداشبورد</MobileLink>}
                {hasPerm(auth, "employees:view") && <MobileLink onClick={()=>go("employees")}>الموظفون</MobileLink>}
                {hasPerm(auth, "fines:view") && <MobileLink onClick={()=>go("fines")}>الغرامات</MobileLink>}
                {hasPerm(auth, "vehicles:view") && <MobileLink onClick={()=>go("vehicles")}>المركبات</MobileLink>}
                {hasPerm(auth, "evaluations:view") && <MobileLink onClick={()=>go("evaluations")}>التقييمات</MobileLink>}
                {hasPerm(auth, "contracts:view") && <MobileLink onClick={()=>go("contracts")}>العقود</MobileLink>}
                {hasPerm(auth, "instructions:view") && <MobileLink onClick={()=>go("instructions")}>التعليمات</MobileLink>}
                {hasPerm(auth, "admin:panel") && <MobileLink onClick={()=>go("admin")}>المسؤول</MobileLink>}
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

function TopLink({ children, onClick, icon }:{children:any; onClick:()=>void; icon?:any;}){
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-brand-100 hover:text-brand-800 dark:text-slate-200 dark:hover:bg-slate-900">
      {icon} {children}
    </button>
  );
}
function MobileLink({ children, onClick }:{children:any; onClick:()=>void;}){
  return (<button onClick={onClick} className="text-right px-3 py-2 rounded-xl hover:bg-brand-100 dark:hover:bg-slate-900">{children}</button>);
}

// ===== Login Page (redesigned) =====
function Login({ onLogin, users }:{ onLogin:(u:User)=>void; users:User[]; }){
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");

  function submit(e:any){
    e.preventDefault();
    const u = users.find(x=>x.username===username && x.password===password);
    if(!u){ setErr("بيانات الدخول غير صحيحة"); return; }
    onLogin(u);
  }

  return (
    <section className="py-16">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
        <div className="rounded-3xl p-8 bg-[var(--glass-bg)] dark:bg-[var(--glass-dark)] border border-white/40 dark:border-slate-800 shadow-glass">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-brand-600 text-white grid place-items-center font-bold text-lg">م</div>
            <div>
              <div className="text-xl font-semibold">أهلاً بك</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">يرجى تسجيل الدخول للوصول للبوابة</div>
            </div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="text-sm">اسم المستخدم</span>
              <input className="mt-1 w-full rounded-2xl border bg-white/80 dark:bg-slate-950/40 px-3 py-2" value={username} onChange={e=>setU(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm">كلمة المرور</span>
              <input type="password" className="mt-1 w-full rounded-2xl border bg-white/80 dark:bg-slate-950/40 px-3 py-2" value={password} onChange={e=>setP(e.target.value)} />
            </label>
            {err && <p className="text-sm text-rose-600">{err}</p>}
            <button className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-semibold text-white bg-brand-600 hover:bg-brand-700 w-full">
              <KeyRound size={16}/> دخول
            </button>
            <p className="text-xs text-slate-500 mt-2">تجربة: admin/admin — onlyeval/123 — onlyfine/123</p>
          </form>
        </div>
        <div className="hidden md:block">
          <div className="relative h-[380px] rounded-3xl overflow-hidden bg-gradient-to-br from-brand-400 to-brand-600">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.25),transparent_40%),radial-gradient(circle_at_70%_60%,rgba(255,255,255,.15),transparent_45%)]"></div>
            <div className="absolute bottom-6 right-6 text-white/90 max-w-sm">
              <h3 className="text-2xl font-bold mb-2">بوابة الموارد الذكية</h3>
              <p className="text-sm leading-relaxed">إدارة الموظفين والغرامات والمركبات والتقييمات والعقود، مع صلاحيات دقيقة وواجهة عصرية متجاوبة.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== Dashboard & Shared Components =====
function Dashboard({ data }:{ data: AppData }){
  const counts = {
    employees: data.employees.length,
    fines: data.fines.length,
    vehicles: data.vehicles.length,
    evals: data.evaluations.length,
    contracts: data.contracts.length,
  };
  const finesTotal = data.fines.reduce((a,b)=>a + (Number(b.amount)||0),0);
  const pie = [
    { name: "الموظفون", value: counts.employees },
    { name: "غرامات", value: counts.fines },
    { name: "مركبات", value: counts.vehicles },
    { name: "تقييمات", value: counts.evals },
    { name: "عقود", value: counts.contracts },
  ];
  const COLORS = ["#8b5cf6","#22C55E","#F59E0B","#06B6D4","#EF4444"];

  return (
    <section className="py-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-3xl border p-6 bg-[var(--glass-bg)] dark:bg-[var(--glass-dark)] shadow-glass">
          <h2 className="text-lg font-semibold mb-3">لمحة سريعة</h2>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="عدد الموظفين" value={counts.employees} />
            <Stat label="إجمالي الغرامات" value={`${finesTotal.toLocaleString()} د.ع`} />
            <Stat label="المركبات" value={counts.vehicles} />
            <Stat label="التقييمات" value={counts.evals} />
            <Stat label="العقود" value={counts.contracts} />
          </div>
        </div>
        <div className="rounded-3xl border p-6 bg-[var(--glass-bg)] dark:bg-[var(--glass-dark)] shadow-glass">
          <h2 className="text-lg font-semibold mb-3">توزيع البيانات</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={pie} outerRadius={100} label>
                  {pie.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
function Stat({ label, value }:{ label:string; value:any }){
  return (
    <div className="rounded-2xl border p-4 bg-white/70 dark:bg-slate-950/30">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

function HeaderRow({ title, icon, data, setData }:{ title:string; icon:any; data: AppData; setData:(d:AppData)=>void; }){
  function exportJson(){ const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json"}); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `app-data-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url); }
  function importJson(ev:any){ const file = ev.target.files?.[0]; if(!file) return; const reader = new FileReader(); reader.onload = () => { try { const obj = JSON.parse(String(reader.result)); setData(obj); alert("تم استيراد البيانات"); } catch { alert("ملف غير صالح"); } }; reader.readAsText(file); }
  return (
    <div className="flex items-center justify-between mb-3">
      <h1 className="text-2xl font-bold flex items-center gap-2">{icon} {title}</h1>
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 border cursor-pointer bg-white/70 dark:bg-slate-950/40"><Upload size={16}/> استيراد<input type="file" accept="application/json" className="hidden" onChange={importJson}/></label>
        <button onClick={exportJson} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 border bg-white/70 dark:bg-slate-950/40"><Download size={16}/> تصدير</button>
      </div>
    </div>
  );
}
function Toolbar({ q, setQ }:{ q:string; setQ:(v:string)=>void }){
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute top-1/2 -translate-y-1/2 right-3" size={16}/>
        <input placeholder="بحث..." className="w-full rounded-2xl border bg-white/70 dark:bg-slate-950/30 px-9 py-2" value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>
    </div>
  );
}
function CrudTable({ headers, children }:{ headers:string[]; children:any; }){
  return (
    <div className="rounded-3xl border overflow-x-auto bg-[var(--glass-bg)] dark:bg-[var(--glass-dark)]">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50/60 dark:bg-slate-900/40 border-b">
            {headers.map((h,i)=>(<th key={i} className="px-3 py-2 font-semibold whitespace-nowrap text-slate-600 dark:text-slate-300">{h}</th>))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function EditCard({ title, onSave, onCancel, children }:{ title:string; onSave:()=>void; onCancel:()=>void; children:any; }){
  return (
    <div className="mt-4 rounded-3xl border p-4 bg-[var(--glass-bg)] dark:bg-[var(--glass-dark)] shadow-glass">
      <div className="flex items-center justify-between mb-2"><h3 className="font-semibold">{title}</h3>
        <div className="flex gap-2"><IconBtn onClick={onSave}><Save size={16}/> حفظ</IconBtn><IconBtn onClick={onCancel}><X size={16}/> إلغاء</IconBtn></div>
      </div>
      {children}
    </div>
  );
}
function IconBtn({ children, onClick, title }:{ children:any; onClick:()=>void; title?:string; }){
  return <button title={title} onClick={onClick} className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 hover:bg-brand-100 dark:hover:bg-slate-900 bg-white/70 dark:bg-slate-950/40">{children}</button>;
}
function Field({ label, value, onChange, type = "text", placeholder= "" }:{ label:string; value:any; onChange:(v:any)=>void; type?:string; placeholder?:string; }){
  return (
    <label className="block">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <input type={type} placeholder={placeholder} className="mt-1 w-full rounded-2xl border bg-white/80 dark:bg-slate-950/30 px-3 py-2" value={value} onChange={(e)=>onChange(e.target.value)} />
    </label>
  );
}
function SelectField({ label, value, onChange, options }:{ label:string; value:any; onChange:(v:any)=>void; options:{label:string; value:string;}[]; }){
  return (
    <label className="block">
      <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
      <select className="mt-1 w-full rounded-2xl border bg-white/80 dark:bg-slate-950/30 px-3 py-2" value={value} onChange={e=>onChange(e.target.value)}>
        {options.map((o,i)=>(<option key={i} value={o.value}>{o.label}</option>))}
      </select>
    </label>
  );
}

// ===== Pages =====
function Employees({ data, setData, canEdit }:{ data:AppData; setData:(d:AppData)=>void; canEdit:boolean; }){
  const [q, setQ] = useState("");
  const list = data.employees.filter(e=>!q || e.name.includes(q) || e.dept?.includes(q) || e.phone?.includes(q));
  const [form, setForm] = useState<Partial<Employee>>({});
  function upsert(){ if(!form.name){ return; } if(form.id){ setData({...data, employees: data.employees.map(e=>e.id===form.id? { ...e, ...form as Employee }: e)});} else { setData({...data, employees: [...data.employees, { id: cryptoId(), name: form.name!, dept: form.dept||"", phone: form.phone||"", joinDate: form.joinDate||"" }]}); } setForm({}); }
  function del(id:string){ setData({...data, employees: data.employees.filter(e=>e.id!==id)}); }
  return (
    <section className="py-4">
      <HeaderRow title="الموظفون" icon={<Users/>} data={data} setData={setData} />
      <Toolbar q={q} setQ={setQ} />
      <CrudTable headers={["الاسم","القسم","الهاتف","تاريخ الانضمام","إجراءات"]}>
        {list.map(e=> (
          <tr key={e.id} className="border-t">
            <td className="px-3 py-2">{e.name}</td>
            <td className="px-3 py-2">{e.dept||"—"}</td>
            <td className="px-3 py-2">{e.phone||"—"}</td>
            <td className="px-3 py-2">{e.joinDate||"—"}</td>
            <td className="px-3 py-2">
              {canEdit && (
                <div className="flex gap-2">
                  <IconBtn title="تعديل" onClick={()=>setForm(e)}><Edit3 size={16}/></IconBtn>
                  <IconBtn title="حذف" onClick={()=>del(e.id)}><Trash2 size={16}/></IconBtn>
                </div>
              )}
            </td>
          </tr>
        ))}
      </CrudTable>
      {canEdit && (
        <EditCard title={form.id?"تعديل موظف":"إضافة موظف"} onSave={upsert} onCancel={()=>setForm({})}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="الاسم" value={form.name||""} onChange={v=>setForm({...form, name:v})} />
            <Field label="القسم" value={form.dept||""} onChange={v=>setForm({...form, dept:v})} />
            <Field label="الهاتف" value={form.phone||""} onChange={v=>setForm({...form, phone:v})} />
            <Field label="تاريخ الانضمام" type="date" value={form.joinDate||""} onChange={v=>setForm({...form, joinDate:v})} />
          </div>
        </EditCard>
      )}
    </section>
  );
}

function Fines({ data, setData, canEdit }:{ data:AppData; setData:(d:AppData)=>void; canEdit:boolean; }){
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Partial<Fine>>({ date: new Date().toISOString().slice(0,10) });
  function upsert(){ if(!form.employeeId || !form.amount){ return; } if(form.id){ setData({...data, fines: data.fines.map(x=>x.id===form.id? { ...x, ...form as Fine }: x)});} else { setData({...data, fines: [...data.fines, { id: cryptoId(), employeeId: form.employeeId!, amount: Number(form.amount), reason: form.reason||"", date: form.date! }]}); } setForm({ date: new Date().toISOString().slice(0,10) }); }
  function del(id:string){ setData({...data, fines: data.fines.filter(e=>e.id!==id)}); }
  return (
    <section className="py-4">
      <HeaderRow title="غرامات الموظفين" icon={<Gavel/>} data={data} setData={setData} />
      <Toolbar q={q} setQ={setQ} />
      <CrudTable headers={["الموظف","المبلغ","السبب","التاريخ","إجراءات"]}>
        {data.fines.filter(f=>!q || f.reason.includes(q)).map(f=> (
          <tr key={f.id} className="border-t">
            <td className="px-3 py-2">{nameById(data.employees, f.employeeId)}</td>
            <td className="px-3 py-2">{Number(f.amount).toLocaleString()} د.ع</td>
            <td className="px-3 py-2">{f.reason||"—"}</td>
            <td className="px-3 py-2">{f.date}</td>
            <td className="px-3 py-2">{canEdit && <div className="flex gap-2"><IconBtn title="تعديل" onClick={()=>setForm(f)}><Edit3 size={16}/></IconBtn><IconBtn title="حذف" onClick={()=>del(f.id)}><Trash2 size={16}/></IconBtn></div>}</td>
          </tr>
        ))}
      </CrudTable>
      {canEdit && (
        <EditCard title={form.id?"تعديل غرامة":"إضافة غرامة"} onSave={upsert} onCancel={()=>setForm({ date: new Date().toISOString().slice(0,10) })}>
          <div className="grid sm:grid-cols-2 gap-3">
            <SelectField label="الموظف" value={form.employeeId||""} onChange={v=>setForm({...form, employeeId:v})} options={data.employees.map(e=>({label:e.name, value:e.id}))} />
            <Field label="المبلغ" type="number" value={form.amount||0} onChange={v=>setForm({...form, amount:Number(v)})} />
            <Field label="التاريخ" type="date" value={form.date||""} onChange={v=>setForm({...form, date:v})} />
            <Field label="السبب" value={form.reason||""} onChange={v=>setForm({...form, reason:v})} />
          </div>
        </EditCard>
      )}
    </section>
  );
}

function Vehicles({ data, setData, canEdit }:{ data:AppData; setData:(d:AppData)=>void; canEdit:boolean; }){
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Partial<Vehicle>>({});
  function upsert(){ if(!form.plate){ return; } if(form.id){ setData({...data, vehicles: data.vehicles.map(v=>v.id===form.id? { ...v, ...form as Vehicle }: v)});} else { setData({...data, vehicles: [...data.vehicles, { id: cryptoId(), plate: form.plate!, model: form.model||"", assignedTo: form.assignedTo||"" }]}); } setForm({}); }
  function del(id:string){ setData({...data, vehicles: data.vehicles.filter(v=>v.id!==id)}); }
  const list = data.vehicles.filter((v:any)=>!q || v.plate.includes(q) || v.model?.includes(q));
  return (
    <section className="py-4">
      <HeaderRow title="المركبات" icon={<Car/>} data={data} setData={setData} />
      <Toolbar q={q} setQ={setQ} />
      <CrudTable headers={["اللوحة","الطراز","مخصص لـ","إجراءات"]}>
        {list.map((v:any)=> (
          <tr key={v.id} className="border-t">
            <td className="px-3 py-2">{v.plate}</td>
            <td className="px-3 py-2">{v.model||"—"}</td>
            <td className="px-3 py-2">{nameById(data.employees, v.assignedTo)||"—"}</td>
            <td className="px-3 py-2">{canEdit && <div className="flex gap-2"><IconBtn title="تعديل" onClick={()=>setForm(v)}><Edit3 size={16}/></IconBtn><IconBtn title="حذف" onClick={()=>del(v.id)}><Trash2 size={16}/></IconBtn></div>}</td>
          </tr>
        ))}
      </CrudTable>
      {canEdit && (
        <EditCard title={form.id?"تعديل مركبة":"إضافة مركبة"} onSave={upsert} onCancel={()=>setForm({})}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="رقم اللوحة" value={form.plate||""} onChange={v=>setForm({...form, plate:v})} />
            <Field label="الطراز" value={form.model||""} onChange={v=>setForm({...form, model:v})} />
            <SelectField label="مخصص للموظف" value={form.assignedTo||""} onChange={v=>setForm({...form, assignedTo:v})} options={[{label:"—", value:""}, ...data.employees.map((e:any)=>({label:e.name, value:e.id}))]} />
          </div>
        </EditCard>
      )}
    </section>
  );
}

function Evaluations({ data, setData, canEdit }:{ data:AppData; setData:(d:AppData)=>void; canEdit:boolean; }){
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Partial<Evaluation>>({ date: new Date().toISOString().slice(0,10), score: 5 });
  function upsert(){ if(!form.employeeId || form.score==null){ return; } if(form.id){ setData({...data, evaluations: data.evaluations.map(v=>v.id===form.id? { ...v, ...form as Evaluation }: v)});} else { setData({...data, evaluations: [...data.evaluations, { id: cryptoId(), employeeId: form.employeeId!, score: Number(form.score), notes: form.notes||"", date: form.date! }]}); } setForm({ date: new Date().toISOString().slice(0,10), score: 5 }); }
  function del(id:string){ setData({...data, evaluations: data.evaluations.filter((v:any)=>v.id!==id)}); }
  const list = data.evaluations.filter((v:any)=>!q || v.notes?.includes(q));
  return (
    <section className="py-4">
      <HeaderRow title="التقييمات" icon={<Eye/>} data={data} setData={setData} />
      <Toolbar q={q} setQ={setQ} />
      <CrudTable headers={["الموظف","الدرجة","ملاحظات","التاريخ","إجراءات"]}>
        {list.map((v:any)=> (
          <tr key={v.id} className="border-t">
            <td className="px-3 py-2">{nameById(data.employees, v.employeeId)}</td>
            <td className="px-3 py-2">{v.score}</td>
            <td className="px-3 py-2">{v.notes||"—"}</td>
            <td className="px-3 py-2">{v.date}</td>
            <td className="px-3 py-2">{canEdit && <div className="flex gap-2"><IconBtn title="تعديل" onClick={()=>setForm(v)}><Edit3 size={16}/></IconBtn><IconBtn title="حذف" onClick={()=>del(v.id)}><Trash2 size={16}/></IconBtn></div>}</td>
          </tr>
        ))}
      </CrudTable>
      {canEdit && (
        <EditCard title={form.id?"تعديل تقييم":"إضافة تقييم"} onSave={upsert} onCancel={()=>setForm({ date: new Date().toISOString().slice(0,10), score: 5 })}>
          <div className="grid sm:grid-cols-2 gap-3">
            <SelectField label="الموظف" value={form.employeeId||""} onChange={v=>setForm({...form, employeeId:v})} options={data.employees.map((e:any)=>({label:e.name, value:e.id}))} />
            <Field label="الدرجة" type="number" value={form.score||0} onChange={v=>setForm({...form, score:Number(v)})} />
            <Field label="التاريخ" type="date" value={form.date||""} onChange={v=>setForm({...form, date:v})} />
            <Field label="ملاحظات" value={form.notes||""} onChange={v=>setForm({...form, notes:v})} />
          </div>
        </EditCard>
      )}
    </section>
  );
}

function Contracts({ data, setData, canEdit }:{ data:AppData; setData:(d:AppData)=>void; canEdit:boolean; }){
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Partial<Contract>>({ start: new Date().toISOString().slice(0,10) });
  function upsert(){ if(!form.employeeId || !form.start){ return; } if(form.id){ setData({...data, contracts: data.contracts.map(v=>v.id===form.id? { ...v, ...form as Contract }: v)});} else { setData({...data, contracts: [...data.contracts, { id: cryptoId(), employeeId: form.employeeId!, start: form.start!, end: form.end, title: form.title||"" }]}); } setForm({ start: new Date().toISOString().slice(0,10) }); }
  function del(id:string){ setData({...data, contracts: data.contracts.filter((v:any)=>v.id!==id)}); }
  const list = data.contracts.filter((v:any)=>!q || v.title?.includes(q));
  return (
    <section className="py-4">
      <HeaderRow title="عقود الموظفين" icon={<FileText/>} data={data} setData={setData} />
      <Toolbar q={q} setQ={setQ} />
      <CrudTable headers={["الموظف","المسمى","البداية","النهاية","إجراءات"]}>
        {list.map((v:any)=> (
          <tr key={v.id} className="border-t">
            <td className="px-3 py-2">{nameById(data.employees, v.employeeId)}</td>
            <td className="px-3 py-2">{v.title||"—"}</td>
            <td className="px-3 py-2">{v.start}</td>
            <td className="px-3 py-2">{v.end||"—"}</td>
            <td className="px-3 py-2">{canEdit && <div className="flex gap-2"><IconBtn title="تعديل" onClick={()=>setForm(v)}><Edit3 size={16}/></IconBtn><IconBtn title="حذف" onClick={()=>del(v.id)}><Trash2 size={16}/></IconBtn></div>}</td>
          </tr>
        ))}
      </CrudTable>
      {canEdit && (
        <EditCard title={form.id?"تعديل عقد":"إضافة عقد"} onSave={upsert} onCancel={()=>setForm({ start: new Date().toISOString().slice(0,10) })}>
          <div className="grid sm:grid-cols-2 gap-3">
            <SelectField label="الموظف" value={form.employeeId||""} onChange={v=>setForm({...form, employeeId:v})} options={data.employees.map((e:any)=>({label:e.name, value:e.id}))} />
            <Field label="المسمى" value={form.title||""} onChange={v=>setForm({...form, title:v})} />
            <Field label="تاريخ البداية" type="date" value={form.start||""} onChange={v=>setForm({...form, start:v})} />
            <Field label="تاريخ النهاية" type="date" value={form.end||""} onChange={v=>setForm({...form, end:v})} />
          </div>
        </EditCard>
      )}
    </section>
  );
}

function Instructions({ data, setData, canEdit }:{ data:AppData; setData:(d:AppData)=>void; canEdit:boolean; }){
  const [text, setText] = useState<string>(data.instructions);
  useEffect(()=>{ setText(data.instructions); }, [data.instructions]);
  function save(){ setData({ ...data, instructions: text }); }
  return (
    <section className="py-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><ScrollText/> تعليمات الشركة</h1>
      <div className="rounded-3xl border p-4 bg-[var(--glass-bg)] dark:bg-[var(--glass-dark)]">
        {canEdit ? (
          <>
            <textarea className="w-full min-h-[220px] rounded-2xl border bg-white/80 dark:bg-slate-950/30 px-3 py-2" value={text} onChange={e=>setText(e.target.value)} />
            <div className="mt-3 flex gap-2">
              <IconBtn onClick={save}><Save size={16}/> حفظ</IconBtn>
            </div>
          </>
        ) : (
          <pre className="whitespace-pre-wrap leading-relaxed">{data.instructions}</pre>
        )}
      </div>
    </section>
  );
}

// ===== Admin (permissions via checkboxes) =====
function Admin({ users, setUsers, currentUser }:{ users:User[]; setUsers:(u:User[])=>void; currentUser:User|null; }){
  const [form, setForm] = useState<Partial<User>>({ role: "staff", permissions: [] });

  function togglePerm(list:string[], key:string){
    if(list.includes("*")) return ["*"];
    return list.includes(key) ? list.filter(p=>p!==key) : [...list, key];
  }
  function upsert(){
    if(!form.username || !form.password || !form.role){ return; }
    if(form.id){
      setUsers(users.map(u=>u.id===form.id? { ...(u as User), ...(form as User) }: u));
    } else {
      setUsers([...users, { id: cryptoId(), username: form.username!, password: form.password!, role: form.role as Role, permissions: (form.permissions as string[])||[] }]);
    }
    setForm({ role: "staff", permissions: [] });
  }
  function del(id:string){
    if(currentUser?.id===id){ alert("لا يمكنك حذف المستخدم الحالي"); return; }
    setUsers(users.filter(u=>u.id!==id));
  }

  return (
    <section className="py-4">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><Shield/> لوحة المسؤول</h1>
      <div className="rounded-3xl border p-4 bg-[var(--glass-bg)] dark:bg-[var(--glass-dark)]">
        <h2 className="font-semibold mb-3 flex items-center gap-2"><Settings size={18}/> المستخدمون والصلاحيات</h2>
        <CrudTable headers={["المستخدم","الدور","الصلاحيات","إجراءات"]}>
          {users.map(u=> (
            <tr key={u.id} className="border-t">
              <td className="px-3 py-2">{u.username}</td>
              <td className="px-3 py-2">{u.role}</td>
              <td className="px-3 py-2 text-xs">{u.permissions.includes("*")?"الكل (*)":u.permissions.join(", ")||"—"}</td>
              <td className="px-3 py-2"><div className="flex gap-2"><IconBtn title="تعديل" onClick={()=>setForm(u)}><Edit3 size={16}/></IconBtn>{currentUser?.id!==u.id && <IconBtn title="حذف" onClick={()=>del(u.id)}><Trash2 size={16}/></IconBtn>}</div></td>
            </tr>
          ))}
        </CrudTable>
        <EditCard title={form.id?"تعديل مستخدم":"إضافة مستخدم"} onSave={upsert} onCancel={()=>setForm({ role: "staff", permissions: [] })}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="اسم المستخدم" value={form.username||""} onChange={v=>setForm({...form, username:v})} />
            <Field label="كلمة المرور" value={form.password||""} onChange={v=>setForm({...form, password:v})} />
            <SelectField label="الدور" value={form.role||"staff"} onChange={v=>setForm({...form, role:v})} options={[{label:"مسؤول (admin)", value:"admin"},{label:"مدير (manager)", value:"manager"},{label:"موظف (staff)", value:"staff"}]} />
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-3 mb-2">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={form.permissions?.includes("*")||false} onChange={(e)=> setForm({...form, permissions: e.target.checked? ["*"] : []})} />
                <span className="text-sm font-medium">منح كل الصلاحيات (*)</span>
              </label>
            </div>
            {!form.permissions?.includes("*") && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {PERMISSIONS.map(key => (
                  <label key={key} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 bg-white/70 dark:bg-slate-950/30">
                    <input type="checkbox" checked={Boolean((form.permissions as string[]||[]).includes(key))} onChange={()=> setForm({...form, permissions: togglePerm((form.permissions as string[]||[]), key)})} />
                    <span className="text-sm">{key}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </EditCard>
      </div>
    </section>
  );
}

function Guard(){
  return (
    <div className="rounded-3xl border p-6 bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 mt-6">
      ليس لديك صلاحية لعرض هذه الصفحة.
    </div>
  );
}

function Footer(){
  return (
    <footer className="mt-10 border-t border-slate-200/60 dark:border-slate-800/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">© {new Date().getFullYear()} — GitHub Pages</div>
          <div className="flex items-center gap-4 text-sm">
            <span>+964-7xx-xxx-xxxx</span>
            <span>info@example.com</span>
            <span>العراق – بغداد</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Helpers
function nameById(list: any[], id: string){ return list.find((x:any)=>x.id===id)?.name || ""; }
