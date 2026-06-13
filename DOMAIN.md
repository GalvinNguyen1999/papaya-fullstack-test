# Bối cảnh nghiệp vụ — Papaya Claims Platform

Tài liệu này giải thích **nghiệp vụ bảo hiểm** mà app mô phỏng, để bất kỳ ai đọc code
cũng hiểu "tại sao" trước khi xem "như thế nào".

---

## 1. Bức tranh lớn

Một công ty bảo hiểm sức khoẻ vận hành theo vòng: **khách đóng phí đều đặn (premium)
→ khi ốm đau, khách nộp yêu cầu đòi tiền (claim) → công ty xem xét rồi chi trả phần
được bảo hiểm.** App này số hoá đúng vòng đó.

Ba từ hay lẫn:

| Khái niệm | Nghĩa |
|-----------|-------|
| **Plan / Policy (gói / hợp đồng)** | Thoả thuận khách mua: được trả những gì, giới hạn bao nhiêu. |
| **Premium (phí)** | Tiền khách đóng định kỳ để duy trì hợp đồng. |
| **Claim (yêu cầu bồi thường)** | Một lần cụ thể khách đòi tiền sau khi đã chi cho y tế. |

Nói gọn: khách **đóng premium** cho một **policy**, và khi ốm thì nộp **claim** để được
trả tiền. **Claim là trung tâm của toàn bộ hệ thống.**

---

## 2. Câu chuyện cụ thể: chị Mai bị viêm ruột thừa

**Trước biến cố.** Chị Mai mua gói **Silver**, đóng phí hằng tháng. Hợp đồng ghi rõ
Silver chi trả gì và giới hạn ra sao. Mai chưa cần gì — chỉ "phòng khi".

**Biến cố.** Mai đau bụng, nhập viện mổ ruột thừa, hết **45.000 THB**. Mai muốn đòi lại
tiền → tạo một **claim**.

Claim đó đi qua hệ thống đúng theo các màn hình của app:

1. **Nộp claim** (màn *Submit claim*, #07) — Mai khai bệnh (viêm ruột thừa), điều trị
   (mổ + nằm viện), số tiền (45.000), ngày, đính kèm giấy tờ. Trạng thái = `SUBMITTED`.
2. **Kiểm giấy tờ** (`DOCUMENTS_VERIFIED`) — nhân viên xác nhận đủ hoá đơn/giấy ra viện.
   Thiếu giấy → chuyển `PENDING_INFO` (xin bổ sung), **không** từ chối thẳng.
3. **Thẩm định** (`UNDER_ASSESSMENT`, màn *Ops review*, #11 + #06) — nhân viên bấm
   "AI thẩm định". AI kiểm 4 việc rồi tính tiền:
   - Hợp đồng còn hiệu lực? Mai có trong hợp đồng? Loại điều trị có được mua? Ngày trong hạn?
   - Điều trị có **cần thiết y khoa** không? (mổ ruột thừa cho viêm ruột thừa = hợp lý).
   - **Tính tiền** theo Silver (copay 10%): bảo hiểm trả 45.000 − 10% = **40.500**,
     Mai tự trả 4.500.
   - AI khuyến nghị **APPROVE** kèm trích dẫn đúng điều khoản.
4. **Quyết định & chi tiền** — `APPROVED` → `PAYMENT_INITIATED` (tài chính tạo lệnh chi)
   → `CLOSED`. Mai nhận 40.500 THB.

---

## 3. Vòng đời một claim (state machine — #14)

```
SUBMITTED ─▶ DOCUMENTS_VERIFIED ─▶ UNDER_ASSESSMENT ─┬─▶ APPROVED ─▶ PAYMENT_INITIATED ─▶ CLOSED
  (member)      (document_clerk)      (assessor + AI)  │     (assessor)     (finance)        (finance)
                      ▲                                ├─▶ REJECTED ─▶ CLOSED
                      │                                │     (assessor)
                      └──────── PENDING_INFO ◀─────────┘  (xin thêm giấy, tối đa 3 lần)
                                 (assessor)
```

- Mỗi lần chuyển bước ghi **AUDIT LOG** (ai, khi nào, lý do) — **không sửa được**.
- Đi sai thứ tự hoặc sai vai trò → **bị chặn** kèm lý do cụ thể.
- Vòng `PENDING_INFO` giới hạn **3 lần**, quá thì phải leo thang (escalate).

---

## 4. Các "van khoá tiền" và tại sao chúng tồn tại

Mỗi quy tắc dưới đây bảo vệ một bên khỏi một rủi ro thật:

| Van khoá | Ý nghĩa | Chống rủi ro gì |
|----------|---------|-----------------|
| **Copay (đồng chi trả)** | Khách gánh một % (Silver 10%). | Lạm dụng dịch vụ vì "miễn phí". |
| **Deductible (mức tự trả đầu)** | Khách tự chịu một khoản đầu năm trước khi BH vào cuộc. | Claim vụn vặt, chi phí xử lý cao. |
| **Limit (hạn mức năm / mỗi lần)** | Trần chi trả. | Công ty vỡ quỹ vì chi vô hạn. |
| **Waiting period (thời gian chờ)** | Mới mua phải chờ X ngày mới dùng được. | Mua bảo hiểm xong dùng ngay rồi nghỉ (anti-selection). |
| **Exclusion (loại trừ)** | Một số dịch vụ không được trả (vd thẩm mỹ). | Chi cho cái ngoài phạm vi bảo hiểm. |
| **Medical necessity (cần thiết y khoa)** | Điều trị phải khớp chẩn đoán. | Kê khống, upcoding (gian lận). |

Thứ tự tính tiền cho một chi phí (engine #06): kiểm *có được bảo hiểm → trong hạn hợp
đồng → không bị loại trừ → qua waiting period → còn lượt khám* → rồi mới **cắt theo
sub-limit → trừ deductible → trừ copay → cắt theo hạn mức năm**. "Ngon-bổ-rẻ" của bảo
hiểm chính là con số cuối cùng này.

---

## 5. Hai phía người dùng

- **Khách (member):** chọn gói (#01) → nộp claim (#07) → theo dõi trạng thái. Quan tâm
  "được trả bao nhiêu, tới đâu rồi".
- **Nhân viên (ops/assessor):** xem hàng đợi → thẩm định bằng AI (#11) → đẩy trạng thái
  theo workflow (#14) → xem dashboard tổng quan (#09). Quan tâm vận hành đúng & nhanh.

**Phân quyền** là một phần nghiệp vụ: chỉ `assessor` được duyệt, chỉ `finance` được chi
tiền, `document_clerk` xác minh giấy. Đây là kiểm soát nội bộ chống gian lận.

---

## 6. Vai trò của AI (và giới hạn có chủ đích)

AI **không tự ý quyết định tiền**. Phần "phán quyết" (APPROVE / REJECT /
REQUEST_MORE_INFO) và số tiền được tính **deterministic** bằng logic thuần trong
`utils/` (engine #06 + report #11). LLM chỉ:
- giúp điều phối các bước kiểm tra, và
- viết lại bản tóm tắt cho người đọc.

Vì thế AI **không thể bịa điều khoản hay bịa số tiền** — mọi trích dẫn đều lấy từ hợp
đồng thật. Nếu không có API key LLM, app vẫn chạy đủ (dùng bản tóm tắt mẫu).

Hai quyết định dễ nhầm:
- **REJECT** (từ chối): có lý do thực chất — hết hiệu lực, không thuộc hợp đồng, ngoài
  hạn, dịch vụ bị loại trừ, hoặc không cần thiết y khoa.
- **REQUEST_MORE_INFO** (xin thêm): claim vốn hợp lệ nhưng **giấy tờ thiếu/sai loại** →
  xin bổ sung, **không** từ chối (để không mất khách oan).

---

## 7. Một câu để nhớ

> Toàn bộ app là **vòng đời của một tờ đơn đòi tiền** — từ lúc khách nộp, qua kiểm tra,
> tính toán và quyết định, đến lúc tiền được chi và đóng hồ sơ. Mỗi cổng chặn tồn tại để
> chống một rủi ro thật: thiếu bằng chứng, gian lận, chi sai, hay mất khách oan.
