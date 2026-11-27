            <input value={paperName} onChange={e => setPaperName(e.target.value)}
              placeholder="General Studies-I / Electrical Engineering / English" required />
          </label>
          {section === 'gs' && <label>GS Paper (optional)
            <input value={gsPaper} onChange={e => setGsPaper(e.target.value)}
              placeholder="GS-I / General Studies-III" />
          </label>}
          {section === 'optional' && <>
            <label>Optional / Specialised Subject
              <input value={optionalSubject}
                onChange={e => setOptionalSubject(e.target.value)}
                placeholder="Geography / Electrical Engineering" required />
            </label>
            <label>Optional Paper
              <input value={optionalPaper} onChange={e => setOptionalPaper(e.target.value)}
                placeholder="Paper-I / Paper-II" />
            </label>
          </>}
        </div>
        <label>Question
          <textarea rows={5} value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="Enter the practice Mains question" required />
        </label>
        <div className="form-two">
          <label>Subject / Syllabus Area
            <input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="History / Governance / Engineering" />
          </label>
          <label>Topic
            <input value={topic} onChange={e => setTopic(e.target.value)}
              placeholder="Federalism / Machines / Agriculture" />
          </label>
        </div>
        <label>Syllabus Linkage
          <textarea rows={2} value={syllabusLink}
            onChange={e => setSyllabusLink(e.target.value)}
            placeholder="Exam syllabus topic covered" />
        </label>
        <div className="form-two">
          <label>Directive
            <input value={directive} onChange={e => setDirective(e.target.value)}
              placeholder="Discuss / Examine / Evaluate" />
          </label>
          <label>Marks
            <input type="number" min="1" value={marks}
              onChange={e => setMarks(e.target.value)} />
          </label>
          <label>Word Limit
            <input type="number" min="1" value={wordLimit}
              onChange={e => setWordLimit(e.target.value)} />
          </label>
          <label>Difficulty
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label>Status
            <select value={status} onChange={e => setStatus(e.target.value as QuestionStatus)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <label>Answer Framework
          <textarea rows={4} value={answerFramework}
            onChange={e => setAnswerFramework(e.target.value)} />
        </label>
        <label>Key Points
          <textarea rows={3} value={keyPoints}
            onChange={e => setKeyPoints(e.target.value)} />
        </label>
        <div className="form-two">
          <label>Introduction Hint
            <textarea rows={3} value={introductionHint}
              onChange={e => setIntroductionHint(e.target.value)} />
          </label>
          <label>Conclusion Hint
            <textarea rows={3} value={conclusionHint}
              onChange={e => setConclusionHint(e.target.value)} />
          </label>
          <label>Reference URL (optional)
            <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
              placeholder="https://..." />
          </label>
          <label>Tags (comma-separated)
            <input value={tagsText} onChange={e => setTagsText(e.target.value)}
              placeholder="Governance, Essay, Science" />
          </label>
        </div>
        {message && <p role="status" style={{ whiteSpace: 'pre-wrap', color: '#5eead4' }}>
          {message}
        </p>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Practice Question' : 'Save Practice Question'}
          </button>
          <button type="button" className="secondary-btn" disabled={saving}
            onClick={clearQuestion}>
            Clear / Cancel Edit
          </button>
        </div>
      </form>
      <hr style={{ borderColor: '#334155', margin: '26px 0' }} />
      <h3>Recently Saved Questions</h3>
      <label>Search Questions
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search exam, paper, topic or question" />
      </label>
      {loading && <p>Loading...</p>}
      {!loading && shown.length === 0 && <p>No matching questions in the most recent 300 entries.</p>}
      {shown.map(item => <article key={item.id}
        style={{ border: '1px solid #334155', padding: 14, marginTop: 10,
          borderRadius: 12 }}>
        <strong>{[item.exam_authority, item.exam_name, item.paper_name]
          .filter(Boolean).join(' • ')}</strong>
        <p style={{ whiteSpace: 'pre-wrap' }}>{item.question}</p>
        <small>{item.status} • {item.subject}</small>
        <div style={{ marginTop: 10 }}>
          <button type="button" className="secondary-btn" onClick={() => edit(item)}>
            Edit Question
          </button>
        </div>
      </article>)}
    </section>
  );
