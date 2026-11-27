      </label>
      <div className="form-two">
        <label>Directive
          <select value={directive} onChange={e => setDirective(e.target.value)}>
            {['Discuss','Examine','Evaluate','Analyse','Comment','Elucidate','Critically examine','Critically analyse'].map(v =>
              <option value={v} key={v}>{v}</option>)}
          </select>
        </label>
        <label>Marks
          <input type="number" step="0.5" min="0.5" value={marks}
            onChange={e => setMarks(e.target.value)} />
        </label>
        <label>Word Limit
          <input type="number" min="1" step="1" value={wordLimit}
            onChange={e => setWordLimit(e.target.value)} />
        </label>
      </div>
      <label>Answer Framework
        <textarea rows={5} value={answerFramework} onChange={e => setAnswerFramework(e.target.value)}
          placeholder="Suggested structure: Introduction → Main Body → Conclusion" />
      </label>
      <label>Key Points
        <textarea rows={4} value={keyPoints} onChange={e => setKeyPoints(e.target.value)}
          placeholder="Facts, examples, committees, judgements or reports" />
      </label>
      <label>Introduction Hint
        <textarea rows={3} value={introductionHint} onChange={e => setIntroductionHint(e.target.value)}
          placeholder="How a strong answer may begin" />
      </label>
      <label>Conclusion Hint
        <textarea rows={3} value={conclusionHint} onChange={e => setConclusionHint(e.target.value)}
          placeholder="Balanced conclusion or way forward" />
      </label>

      <section className="panel" style={{ marginBottom: 18 }}>
        <span className="eyebrow">VISUAL ANSWER FRAMEWORK</span>
        <h3>Add Maps, Diagrams, Flowcharts or Graphs</h3>
        <p>These visuals can be shown with the suggested answer framework after the student attempts the question.</p>
        {savedImagePaths.length > 0 && <div className="tag-row" style={{ marginBottom: 12 }}>
          {savedImagePaths.map(path => <div key={path} style={{ maxWidth: 170 }}>
            {imageUrls[path]
              ? <img src={imageUrls[path]} alt="Saved answer framework" style={{ width: '100%', maxHeight: 140, objectFit: 'contain' }} />
              : <small>Saved image</small>}
            <button type="button" className="secondary-btn"
              onClick={() => setSavedImagePaths(old => old.filter(p => p !== path))}>Remove</button>
          </div>)}
        </div>}
        <StudentNoteImagePicker images={pendingImages} onChange={setPendingImages}
          maxImages={Math.max(0, MAX_FRAMEWORK_IMAGES - savedImagePaths.length)} disabled={saving} />
        <small>Maximum {MAX_FRAMEWORK_IMAGES} images. Stored privately using the same CSE framework uploader.</small>
      </section>

      <label>Tags
        <input value={tagsText} onChange={e => setTagsText(e.target.value)}
          placeholder="GS-II, Federalism, Constitution" />
        <small>Separate tags using commas.</small>
      </label>
      <div className="form-two">
        <label>Source
          <input value={source} onChange={e => setSource(e.target.value)}
            placeholder="UPSC / PIB / NCERT / ARC" />
        </label>
        <label>Source URL
          <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://..." />
        </label>
        <label>Difficulty
          <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}>
            <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
          </select>
        </label>
        <label>Status
          <select value={status} onChange={e => setStatus(e.target.value as QuestionStatus)}>
            <option value="draft">Draft</option><option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      {message && <p role="status" style={{ whiteSpace: 'pre-wrap', color: '#5eead4' }}>{message}</p>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? 'Saving...' : editingId ? 'Update Question' : status === 'published' ? 'Publish Question' : 'Save Draft'}
        </button>
        <button type="button" className="secondary-btn" disabled={saving}
          onClick={() => { clearQuestionForm(); setMessage(''); }}>Clear / Cancel Edit</button>
      </div>
    </form>

    <hr style={{ margin: '26px 0', borderColor: '#334155' }} />
    <h3>Existing Other UPSC & State PSC Questions</h3>
    <label>Search Mains Question Bank
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search question, subject, topic or source" />
    </label>
    <button type="button" className="secondary-btn" onClick={() => void loadRecent()}>Refresh Questions</button>
    {loading && <p>Loading questions...</p>}
    {!loading && filteredRecent.length === 0 && <p>No matching questions among the most recent 300 entries.</p>}
    {filteredRecent.map(item => <article className="panel" key={item.id} style={{ marginTop: 10 }}>
      <div className="tag-row">
        <span className="tag">{item.exam_authority}</span>
        <span className="tag">{item.exam_name}</span>
        <span className="tag">{item.question_type === 'pyq' ? `PYQ ${item.pyq_year || ''}` : 'Practice'}</span>
        {strings(item.gs_relevance_papers).length > 0 &&
          <span className="tag">Relevant to {strings(item.gs_relevance_papers).join(', ')}</span>}
      </div>
      <p style={{ whiteSpace: 'pre-wrap' }}><strong>{item.question}</strong></p>
      <small>{item.subject} · {item.status}</small>
      <div style={{ marginTop: 10 }}>
        <button type="button" className="secondary-btn" onClick={() => void startEdit(item)}>Edit Question</button>
      </div>
    </article>)}
  </section>;
}
