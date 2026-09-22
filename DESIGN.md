# ChanoX2 Design System & Color Foundation

> **Single Source of Truth for ChanoX2 UI Design, Theme Consistency, and Color Tokens**  
> อิงมาตรฐานเดียวกับ ChanomHub Frontend (`/home/jop/work/chanomhub/frontend/DESIGN.md` และ `UI_RULES.md`) เพื่อให้แอปพลิเคชันเดสก์ท็อปและทุกหน้า (Store, Library, Downloads, Settings, ArticleDetail) สอดคล้องเป็นหนึ่งเดียวกับอัตลักษณ์ของ ChanomHub

---

## 1. Brand Identity & Color Philosophy (อัตลักษณ์แบรนด์ชานม)

* **Brand Philosophy:** **ChanomHub** (ชานม) — ธีมหลักเป็นโทนสีชาอบอุ่น (Warm Amber/Tea) ผสานกับพื้นหลังโทนเข้มลุ่มลึก (Deep Warm Dark) ไม่ใช่โทนฟ้าซีดแบบ Steam รุ่นเก่า หรือสีมั่วผสมชมพู/แดง
* **Theme Model:** **Dark-First Premium Desktop App**
* **Primary Brand Accent:** **Warm Golden Amber** (`hsl(38 92% 52%)` / `#f59e0b`) เป็นสีหลักสำหรับ Active states, ปุ่ม CTA, ดาวน์โหลด, ตัวบ่งชี้ความเร็ว, focus ring, และ badge เด่น

---

## 2. กฎเหล็กความสม่ำเสมอของสี (Color Consistency Rules)

ทุกหน้าใน ChanoX2 (รวมถึง Component ย่อยทั้งหมด) ต้องปฏิบัติตามกฎนี้อย่างเคร่งครัด:

| ❌ สิ่งที่ห้ามทำ (Inconsistent / Legacy) | ✅ สิ่งที่ต้องใช้ (ChanomHub Standard) | เหตุผล |
|---|---|---|
| **ห้ามใช้สีฟ้า Steam โบราณ** (`#66c0f4`, `#1b2838`, `#1a2a3a`, `#2d3a4f`) กระจัดกระจาย | ใช้ `bg-card`, `bg-background`, `text-primary`, `border-border` | สีฟ้า Steam ทำให้ ChanoX2 ดูเหมือนแอปโคลน ไม่ตรงกับแบรนด์ ChanomHub |
| **ห้ามผสมสีสะเปะสะปะตามใจชอบ** (เช่น ปุ่มใน Home เป็น `rose-500` แต่หน้า Downloads เป็น `#66c0f4`) | ใช้ Semantic Tokens `bg-primary`, `text-primary`, `border-primary/30` ทั้งระบบ | ทุกหน้าต้องมี Visual Language และ Accent Color เดียวกัน |
| **ห้าม Hardcode Hex Codes ใน Component** (`bg-[#0a0e14]`, `bg-[#171d25]`, `bg-[#111721]`, `text-[#dcdedf]`) | ใช้ Tailwind Semantic Classes (`bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`) | ป้องกันสีกระจัดกระจาย จัดการธีมได้ที่จุดเดียว |
| **ห้ามสร้าง Border และ Surface หลายโทนสี** (ฟ้าบ้าง เทาบ้าง ดำสนิทบ้าง) | ใช้ `border-border` หรือ `border-border/60` และ `bg-card` | คุม Hierarchy ให้สบายตา เน้น Contrast ของ Surface ที่นุ่มนวล |

---

## 3. Design Tokens System (Tailwind Semantic Tokens)

ChanoX2 ใช้ระบบ CSS Variables ผ่าน `src/styles/globals.css` และ `tailwind.config.js`:

| Semantic Token | Tailwind Class | ค่าสี (Warm Dark Tea Tone) | หน้าที่ในการใช้งาน |
|---|---|---|---|
| `--background` | `bg-background` | `hsl(30 15% 9%)` (`#161311`) | พื้นหลังหลักของทุกหน้า และหน้าต่างหลัก |
| `--foreground` | `text-foreground` | `hsl(40 20% 95%)` (`#f6f4f0`) | ข้อความหลัก, หัวข้อสำคัญ, ชื่อเกม |
| `--card` | `bg-card` | `hsl(30 12% 13%)` (`#241e1a`) | พื้นผิวการ์ดเกม, Sidebar, แผงควบคุม, Dialog |
| `--card-foreground` | `text-card-foreground` | `hsl(40 20% 95%)` | ข้อความภายในการ์ด |
| `--popover` | `bg-popover` | `hsl(30 12% 15%)` | Dropdown menu, Tooltip, Dialog ลอย |
| `--primary` | `bg-primary`, `text-primary` | `hsl(38 92% 52%)` (`#f59e0b`) | สีแบรนด์ชาทอง: ปุ่มหลัก (Install/Play), Active Tab, Highlight |
| `--primary-foreground` | `text-primary-foreground` | `hsl(30 20% 10%)` | ข้อความบนปุ่ม solid primary เพื่อความคมชัดสูงสุด |
| `--secondary` | `bg-secondary` | `hsl(30 10% 18%)` | ปุ่มรอง, กล่องข้อมูลสถิติ, Filter chip |
| `--muted` | `bg-muted` | `hsl(30 10% 17%)` | พื้นหลังช่องค้นหา, กล่องปิดใช้งาน, Inactive state |
| `--muted-foreground` | `text-muted-foreground` | `hsl(35 12% 65%)` (`#aba39a`) | ข้อความรอง, คำอธิบาย, วันที่, ขนาดไฟล์, ขนาดเวอร์ชัน |
| `--border` | `border-border` | `hsl(30 10% 21%)` (`#3b342e`) | เส้นขอบกล่อง, เส้นแบ่งหน้าต่าง, กรอบการ์ด |
| `--destructive` | `bg-destructive`, `text-destructive` | `hsl(0 75% 55%)` | ปุ่มลบ, ยกเลิกการติดตั้ง, ข้อความ error |

---

## 4. มาตรฐานของแต่ละหน้า (Page Layout & Color Guidelines)

### 4.1 Shell หลัก (TitleBar & MenuBar)
- **TitleBar (`src/components/common/TitleBar.tsx`):**
  - พื้นหลัง: `bg-background` หรือโทนทึบเข้มขอบบน `border-b border-border/60`
  - โลโก้แอป: `text-primary font-bold tracking-wider`
  - ปุ่ม Minimize/Maximize/Close: `hover:bg-muted text-muted-foreground hover:text-foreground` (ปุ่มปิด hover สีแดง)
- **MenuBar (`src/components/common/MenuBar.tsx`):**
  - พื้นหลัง: `bg-card border-b border-border/80`
  - แท็บเมนูที่ Active (STORE, LIBRARY, DOWNLOADS): `bg-primary/15 text-primary border-b-2 border-primary`
  - แท็บเมนูที่ Inactive: `text-muted-foreground hover:text-foreground hover:bg-muted/50`

### 4.2 หน้า Store / Catalog (`src/pages/Home.tsx`)
- พื้นหลังหน้า: `bg-background`
- Header ค้นหา & ตัวกรอง: `bg-card/50 border-b border-border/60`
- Input ค้นหา: `bg-muted/60 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary focus:border-primary`
- View Mode Toggle (Grid/List):
  - ปุ่ม Active: `bg-primary/20 text-primary border border-primary/40` (เลิกใช้ `rose-500`)
  - ปุ่ม Inactive: `text-muted-foreground hover:text-foreground`
- การ์ดเกม (`GameCard.tsx`):
  - กรอบการ์ด: `bg-card border border-border/60 hover:border-primary/50 transition-all`
  - ราคา / แท็กฟรี: `text-primary font-semibold`

### 4.3 หน้า Library (`src/pages/Library.tsx`)
- พื้นหลังหน้า: `bg-background`
- Sidebar รายการเกม (`LibrarySidebar.tsx`):
  - พื้นหลัง: `bg-card border-r border-border/60`
  - ไอเทมเกมที่เลือก: `bg-primary/15 text-primary border-l-2 border-primary`
  - ไอเทมปกติ: `text-muted-foreground hover:text-foreground hover:bg-muted/40`
- รายละเอียดเกม (`LibraryGameDetail.tsx`):
  - ปุ่ม PLAY: `bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm`
  - แท็บข้อมูล / การตั้งค่าเกม: ใช้ token `text-foreground`, `border-border`, `bg-card`

### 4.4 หน้า Downloads (`src/pages/Downloads.tsx`)
- พื้นหลังหน้า: `bg-background`
- Header แถบสถิติความเร็ว (Network / Peak / Disk):
  - เลิกใช้สีฟ้า `#66c0f4` เปลี่ยนไอคอนเป็น `text-primary`
  - ตัวเลขความเร็ว: `text-foreground font-semibold font-mono`
  - แถบ Progress: สี `bg-primary` บนแทร็ก `bg-muted`
- รายการดาวน์โหลด: `bg-card border border-border/60`

### 4.5 หน้า Settings (`src/pages/Settings.tsx`)
- พื้นหลังหน้า: `bg-background`
- เมนูด้านซ้าย: `bg-card border-r border-border/60`
  - รายการเลือก: `bg-primary/15 text-primary border-l-2 border-primary`
- กล่องตั้งค่า: `Card` ที่มี `border-border/60 bg-card`
- สวิตช์และ Checkbox: ใช้ `primary` เมื่อเปิดใช้งาน

---

## 5. Checklist ก่อนส่งมอบงาน UI
1. [ ] ไม่มีโค้ดสีฮาร์ดโค้ด `#66c0f4`, `#1b2838`, `#1a2a3a`, หรือ `rose-500` หลงเหลือในหน้า UI
2. [ ] ทุกพื้นหลังใช้ `bg-background`, `bg-card`, หรือ `bg-muted`
3. [ ] ทุกตัวอักษรใช้ `text-foreground`, `text-muted-foreground`, หรือ `text-primary`
4. [ ] ทุกเส้นขอบใช้ `border-border` หรือ `border-border/60`
5. [ ] ปุ่มและจุดเน้นหลักใช้ `bg-primary` (`#f59e0b` warm amber)
6. [ ] ทดสอบความกลมกลืนของการเปลี่ยนหน้าระหว่าง Store -> Library -> Downloads -> Settings ไม่มีความรู้สึกกระโดดของสี
