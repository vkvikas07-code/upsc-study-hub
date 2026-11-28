        </section>
        <label>Tags (comma-separated)
          <input value={form.tags} onChange={(event: ValueChangeEvent) => set('tags', event.target.value)}
            placeholder="GS-II, Constitution, Language, Essay" />
        </label>
        <div className="form-two">
          <label>Source
            <input value={form.source} onChange={(event: ValueChangeEvent) => set('source', event.target.value)}
              placeholder="UPSC / NCERT / PIB" />
          </label>
          <label>Source URL
            <input type="url" value={form.sourceUrl} onChange={(event: ValueChangeEvent) => set('sourceUrl', event.target.value)}
              placeholder="https://..." />
          </label>
          <label>Difficulty
            <select value={form.difficulty} onChange={(event: ValueChangeEvent) => set('difficulty', event.target.value as Difficulty)}>
              <option value="easy">Easy</option><option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label>Status
            <select value={form.status} onChange={(event: ValueChangeEvent) => set('status', event.target.value as Status)}>
              <option value="draft">Draft</option><option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        {message && <p role="status" style={{ whiteSpace: 'pre-wrap', color: '#5eead4' }}>{message}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update Question' :
              form.status === 'published' ? 'Publish Question' : 'Save Draft'}
          </button>
          <button type="button" className="secondary-btn" disabled={saving}
            onClick={() => { resetForm(); setMessage(''); }}>Clear / Cancel Edit</button>
        </div>
      </form>
      <hr style={{ margin: '26px 0', borderColor: '#334155' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div><span className="eyebrow">MAINS QUESTION BANK</span><h2>Existing Mains Questions</h2></div>
        <button type="button" className="secondary-btn" onClick={() => void loadQuestions()}>Refresh Questions</button>
      </div>
      <label>Search Mains Question Bank
        <input value={search} onChange={(event: ValueChangeEvent) => setSearch(event.target.value)}
          placeholder="Question / Topic / Subject / Language" />
      </label>
      <div className="form-two">
        <label>Section
          <select value={filterSection} onChange={(event: ValueChangeEvent) => setFilterSection(event.target.value as FilterSection)}>
            <option value="all">All Sections</option>
            {(['gs', 'essay', 'optional', 'language'] as Section[]).map(value =>
              <option key={value} value={value}>{sectionLabel(value)}</option>)}
          </select>
        </label>
        <label>Question Type
          <select value={filterType} onChange={(event: ValueChangeEvent) => setFilterType(event.target.value as 'all' | QuestionType)}>
            <option value="all">All Questions</option><option value="practice">Practice</option>
            <option value="pyq">Previous Year</option>
          </select>
        </label>
        <label>Status
          <select value={filterStatus} onChange={(event: ValueChangeEvent) => setFilterStatus(event.target.value as 'all' | Status)}>
            <option value="all">All Statuses</option><option value="draft">Draft</option>
            <option value="published">Published</option><option value="archived">Archived</option>
          </select>
        </label>
        {filterSection === 'gs' && <label>GS Paper
          <select value={filterGs} onChange={(event: ValueChangeEvent) => setFilterGs(event.target.value)}>
            <option value="all">All GS Papers</option>
            {GS.map(paper => <option key={paper} value={paper}>{paper}</option>)}
          </select>
        </label>}
        {filterSection === 'optional' && <label>Optional Subject
          <select value={filterOptional} onChange={(event: ValueChangeEvent) => setFilterOptional(event.target.value)}>
            <option value="all">All Optional Subjects</option>
            {OPTIONALS.map(item => <option value={item} key={item}>{item}</option>)}
          </select>
        </label>}
        <label>Difficulty
          <select value={filterDifficulty} onChange={(event: ValueChangeEvent) => setFilterDifficulty(event.target.value)}>
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option><option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
        {filterSection === 'language' && <label>Compulsory Language
          <select value={filterLanguage} onChange={(event: ValueChangeEvent) => setFilterLanguage(event.target.value)}>
            <option value="all">All Languages</option>
            {LANGUAGES.map(language => <option value={language} key={language}>{language}</option>)}
          </select>
        </label>}
      </div>
      {loading && <p>Loading Mains questions...</p>}
      {!loading && shown.length === 0 && <p>No questions match the filters.</p>}
      <p>{shown.length} question(s)</p>
      <div style={{ display: 'grid', gap: 12 }}>
        {shown.map(item => <article key={item.id} className="panel">
          <span className="eyebrow">
            {item.section_type === 'language' ? `${item.subject} (Compulsory)` :
              item.section_type === 'gs' ? item.gs_paper :
              item.section_type === 'essay' ? 'Essay' : `${item.optional_subject} · ${item.optional_paper}`}
          </span>
          <h3 style={{ whiteSpace: 'pre-wrap' }}>{item.question}</h3>
          <div className="tag-row">
            <span className="tag">{item.question_type === 'pyq' ? `PYQ ${item.pyq_year || ''}` : 'Practice'}</span>
            <span className="tag">{item.status}</span>
            {list(item.gs_relevance_papers).length > 0 &&
              <span className="tag">Also relevant to: {list(item.gs_relevance_papers).join(', ')}</span>}
            {list(item.framework_image_paths).length > 0 && <span className="tag">Visual framework available</span>}
          </div>
          <p>{item.subject}{item.topic ? ` · ${item.topic}` : ''}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="secondary-btn" onClick={() => void startEdit(item)}>Edit</button>
            {item.status !== 'published' && <button type="button" className="secondary-btn"
              onClick={() => void changeStatus(item, 'published')}>Publish</button>}
            {item.status !== 'archived' && <button type="button" className="secondary-btn"
              onClick={() => void changeStatus(item, 'archived')}>Archive</button>}
            <button type="button" className="secondary-btn" onClick={() => void deleteQuestion(item)}>Delete</button>
          </div>
        </article>)}
      </div>
    </section>
  );
}

export default MainsQuestionManager;
