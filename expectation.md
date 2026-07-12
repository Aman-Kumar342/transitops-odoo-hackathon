# Hackathon Expectations & Evaluation Guide

This document captures what the evaluator expects from our TransitOps submission.
Every design decision, commit, and demo should trace back to something on this page.

> **Most important:** Database Design is emphasized as the single most heavily
> weighted criterion. Model the data well before writing feature code.

---

## 1. Core Coding Standards

| # | Standard | What it means for us |
|---|----------|----------------------|
| 1 | **Thoughtful Approach** | Understand the problem statement before coding. Justify decisions, don't just optimize for speed. |
| 2 | **Well-Structured & Scalable** | Design an architecture that can grow — clear layers, separation of concerns. |
| 3 | **Clean Code** | Readable, maintainable, self-documenting code with consistent naming and formatting. |
| 4 | **Modular Architecture** | Break the system into reusable, independent modules. Follow established patterns (MVC/service-repository/etc.). |
| 5 | **Minimal Third-Party APIs** | Build from scratch where reasonable. Avoid dependencies that add risk or hidden bugs; use libraries only when they add clear value. |

---

## 2. Technical & Database Requirements

- **Database Design (top priority):** Model entities, relationships, keys, and
  constraints carefully. Normalize sensibly; document the schema (ERD).
- **Local Databases only:** Use **MySQL** or **PostgreSQL**. Do **not** use BaaS
  platforms (Firebase, Supabase, MongoDB Atlas).
- **Robust Backend APIs:** Design clean, well-documented, RESTful (or equivalent)
  endpoints with proper status codes and error handling.
- **Real-time & Dynamic Data:** The final solution must run on live/dynamic data.
  Static JSON is acceptable **only** for early prototyping.

---

## 3. Functionality & Logic

- **Logical Thinking:** Demonstrate strong reasoning in how features are built.
- **Robust Input Validation:** Handle user errors gracefully — e.g., clear
  feedback for an invalid email, out-of-range values, or missing fields.
- **Modern Tech (only if it adds value):** AI, Blockchain, or Chatbots are
  encouraged **only** when they genuinely improve the solution — never for show.
- **Tool Proficiency:** Understand every tool and line we use. No blind
  copy-paste; be able to explain *why* and *how* each piece works.

---

## 4. UI/UX & Design

- **Clean & Responsive UI:** Consistent color scheme and layout across screens;
  works across device sizes.
- **Intuitive Navigation:** Menus that make sense, with proper spacing and flow.

---

## 5. Teamwork & Workflow

- **Proper Use of Git:** Version control is a team sport — **every member must
  contribute** to the repo, not just one person. Meaningful, attributed commits.
- **Collaborative Presentation:** Everyone participates in the final presentation
  to show shared ownership.

---

## 6. Evaluation Criteria (the scorecard)

The evaluator scores on these points:

1. **Coding Standards**
2. **Logic**
3. **Modularity**
4. **Frontend Design**
5. **Performance**
6. **Scalability**
7. **Security**
8. **Usability**
9. **Debugging Skills**
10. **Database Design** — ⭐ *emphasized as the most important*
11. **Attention to Detail**

---

## 7. Pre-Submission Checklist

- [ ] ERD / schema documented and reviewed
- [ ] Local Postgres/MySQL wired up (no BaaS)
- [ ] Backend APIs documented with request/response examples
- [ ] Input validation on every user-facing field
- [ ] Real-time/dynamic data flowing end-to-end
- [ ] Responsive UI with consistent theme
- [ ] Every team member has meaningful commits
- [ ] Security basics: auth, input sanitization, no secrets in repo
- [ ] Performance sanity-checked (queries indexed, no obvious N+1)
- [ ] Everyone rehearsed for the presentation
