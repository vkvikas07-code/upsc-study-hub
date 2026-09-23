/* =========================================================
   DARK FORM FIX
   Makes text inputs, textarea and select match dark theme
   Also fixes Chrome autofill white/yellow background
========================================================= */

input,
textarea,
select {
  width: 100%;
  background: rgba(7, 17, 40, 0.95);
  color: #e8eefc;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  line-height: 1.4;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

input::placeholder,
textarea::placeholder {
  color: #7f8da8;
}

input:focus,
textarea:focus,
select:focus {
  border-color: rgba(45, 212, 191, 0.7);
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.14);
  background: rgba(8, 20, 48, 1);
  color: #f8fbff;
}

/* Fix browser autofill white/yellow patch */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
textarea:-webkit-autofill,
textarea:-webkit-autofill:hover,
textarea:-webkit-autofill:focus,
select:-webkit-autofill,
select:-webkit-autofill:hover,
select:-webkit-autofill:focus {
  -webkit-text-fill-color: #e8eefc !important;
  -webkit-box-shadow: 0 0 0px 1000px rgba(7, 17, 40, 0.95) inset !important;
  box-shadow: 0 0 0px 1000px rgba(7, 17, 40, 0.95) inset !important;
  transition: background-color 9999s ease-in-out 0s;
  caret-color: #e8eefc;
}

/* Optional: better label spacing in admin forms */
.admin-form label {
  display: block;
  color: #dce7f9;
  font-weight: 600;
  margin-bottom: 14px;
}

.admin-form small {
  color: #8ea0bf;
}

/* Optional: if rows are too tight */
.form-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 900px) {
  .form-two {
    grid-template-columns: 1fr;
  }
}
