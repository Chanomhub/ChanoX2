# ChanoX2 UI Architecture & Consistency Rules

> **ChanoX2 Desktop Application UI Governance**  
> กฎและข้อบังคับในการพัฒนา UI สำหรับ ChanoX2 เพื่อให้ทุกหน้า ทุกโมดูล และทุกคอมโพเนนต์เป็นไปในทิศทางเดียวกัน 100%

---

## 1. กฎเหล็ก UI (Core Rules)

1. **อัตลักษณ์ต้องตรงกับ ChanomHub**:
   - ใช้โทน Warm Dark Amber (สีชานมโทนทอง) เป็น Accent หลัก
   - ห้ามใช้สีฟ้า Steam ดั้งเดิม (`#66c0f4`, `#1b2838`, `#1a2a3a`)
   - ห้ามสลับ accent เป็นสีอื่นตามใจชอบ (เช่น `rose-500` ในหน้าหนึ่ง แล้วฟ้าในอีกหน้าหนึ่ง)

2. **ใช้ Design Tokens เท่านั้น (Zero Arbitrary Colors)**:
   - ห้ามใช้ `bg-[#...]`, `text-[#...]`, `border-[#...]`
   - ต้องใช้ Tailwind Semantic Tokens (`bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`) เสมอ

3. **ความต่อเนื่องระหว่างหน้า (Visual Continuity)**:
   - ทุกหน้าต้องมี Shell เดียวกัน (`TitleBar` และ `MenuBar`)
   - พื้นหลังของหน้าหลักต้องเป็น `bg-background` เสมอ
   - Panel ด้านข้าง (Sidebars) ทั้งใน Store, Library, และ Settings ต้องใช้ `bg-card border-r border-border/60` เหมือนกัน
   - Active state ของไอเทมใน Sidebar ต้องใช้รูปแบบเดียวกัน: `bg-primary/15 text-primary border-l-2 border-primary`

4. **Component Standard (`@/components/ui`)**:
   - ปุ่มต้องใช้ `<Button variant="..." size="...">` จาก `@/components/ui/Button`
   - กล่องคอนเทนต์ต้องใช้ `<Card>`, `<CardHeader>`, `<CardTitle>`, `<CardContent>`
   - ไอคอนต้องใช้ `lucide-react` เท่านั้น (ยกเว้นไอคอนเฉพาะกิจเช่น Platform SVG ที่ใช้ `fill="currentColor"`)
   - ขอบมน (Border Radius) ใช้มาตรฐาน `rounded-lg` หรือ `rounded-xl` สม่ำเสมอกัน

5. **Focus & Interactive Feedback**:
   - Focus ring ของช่องค้นหาและ Input ต้องเป็น `focus:ring-primary/50 focus:border-primary/50`
   - Hover state บนการ์ดเกมต้องเป็น `hover:border-primary/50 hover:bg-card/90 transition-all`
