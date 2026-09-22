# ChanoX2 Commit Convention & Rules

โปรเจกต์ ChanoX2 ใช้มาตรฐาน **Conventional Commits** เพื่อความเป็นระเบียบของ Git History และช่วยให้ระบบ **GitHub Actions Release** นำข้อความ Commit ไปจัดหมวดหมู่ใน Release Notes ให้อัตโนมัติ

---

## 1. รูปแบบ Commit Message (Format)

```text
<type>(<scope>): <subject>

[optional body: รายละเอียดเพิ่มเติม]
[optional footer: BREAKING CHANGE หรือ Closes #issue]
```

### ตัวอย่าง:
- `feat(library): add persistent font metadata tracking`
- `style(ui): unify ChanoX2 theme to Warm Dark Amber`
- `fix(download): resolve pause state synchronization`
- `chore(release): bump version to 1.7.0`
- `feat(core)!: redesign local database schema` *(มีเครื่องหมาย `!` แสดงถึง Breaking Change)*

---

## 2. หมวดหมู่ Commit (`<type>`)

ระบบ GitHub Actions (`build-release.yml`) จะจัดหมวดหมู่ใน Release Notes ตามตารางนี้:

| Type | ความหมาย | หมวดหมู่ใน Release Notes | ตัวอย่างการใช้งาน |
| :--- | :--- | :--- | :--- |
| `feat` | เพิ่มฟีเจอร์หรือความสามารถใหม่ | 🚀 **New Features** | `feat(chat): add sticker support` |
| `style` หรือ `ui` | ปรับปรุงหน้าตา UI, CSS, ธีมสี | 🎨 **UI & Design Improvements** | `style(ui): update GameCard hover glow` |
| `fix` | แก้ไขข้อผิดพลาด / บั๊ก | 🐛 **Bug Fixes** | `fix(wine): fix winetricks dialog hang` |
| `perf` | ปรับปรุงประสิทธิภาพ / ความเร็ว | ⚡ **Performance** | `perf(images): cache thumbnail blobs` |
| `refactor` | ปรับโครงสร้างโค้ด (ไม่กระทบการทำงาน) | ♻️ **Refactoring** | `refactor: simplify useArticleSearch hook` |
| `docs` | เพิ่มหรือแก้ไขเอกสาร Markdown | 📝 **Documentation** | `docs: add commit rules and design spec` |
| `chore` | งานทั่วไป เช่น อัปเดตแพ็กเกจ, build | 📝 **Documentation & Others** | `chore: update dependencies` |
| `ci` | ปรับแต่ง CI/CD / GitHub Workflows | 📝 **Documentation & Others** | `ci: enhance release changelog generator` |
| `test` | เพิ่มหรือปรับปรุง Unit Test | 📝 **Documentation & Others** | `test(auth): add token refresh test cases` |
| `revert` | ยกเลิก Commit ก่อนหน้า | 📝 **Documentation & Others** | `revert: "fix(store): ..."` |

### 🚨 Breaking Changes:
- หากมีการเปลี่ยนแปลงที่ส่งผลกระทบต่อเวอร์ชันเดิม ให้ใส่เครื่องหมาย `!` ท้าย type เช่น:
  `feat!: change storage format to sqlite`
  หรือระบุ `BREAKING CHANGE: ...` ในส่วนท้ายของ commit body
- ระบบจะนำไปใส่ในหัวข้อ **🚀 Major / Breaking Changes** โดยอัตโนมัติ

---

## 3. ขอบเขตงาน (`<scope>`) ที่แนะนำ

การระบุ `<scope>` ช่วยให้เพื่อนร่วมทีมรู้ทันทีว่าแก้ส่วนไหน:
- `(ui)`: ดีไซน์โดยรวม, สไตล์, CSS
- `(library)`: หน้ารวมเกมที่ติดตั้ง, Font, Mod manager
- `(store)`: หน้าร้านค้า, ค้นหา, หน้ารายละเอียดเกม
- `(download)`: ระบบคิวดาวน์โหลด, แตกไฟล์, ติดตั้ง
- `(chat)`: ระบบห้องแชตโลก
- `(settings)`: การตั้งค่าแอพ, ภาษา, บัญชี
- `(auth)`: ระบบ Login, Token, Session
- `(wine)`: Wine, Proton, Winetricks
- `(release)`: การออกเวอร์ชันใหม่, Bump version

---

## 4. กฎการเขียนที่ระบบตรวจสอบ (Linting Rules)

ระบบมี **Husky Hook (`commit-msg`)** ร่วมกับ **Commitlint** คอยตรวจสอบก่อน Commit ทุกครั้ง:
1. `<type>` ต้องเป็นพิมพ์เล็ก และต้องอยู่ในรายการที่กำหนดเท่านั้น
2. ห้ามเว้นว่าง `<type>` และ `<subject>`
3. ห้ามใส่จุด `.` ปิดท้าย `<subject>`
4. ข้อความกระชับและสื่อความหมายชัดเจน
5. **❌ สิ่งที่ห้ามทำ:**
   - `update`
   - `fix`
   - `done`
   - `asdfgh`
   *(ระบบจะปฏิเสธการ commit ทันทีพร้อมแจ้งเตือน)*
