                                      Question No.

                                      <input
                                        value={
                                          editQuestionNumber
                                        }
                                        onChange={
                                          event =>
                                            setEditQuestionNumber(
                                              event.target.value
                                            )
                                        }
                                      />
                                    </label>

                                    <label>
                                      Marks

                                      <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={
                                          editMarks
                                        }
                                        onChange={
                                          event =>
                                            setEditMarks(
                                              event.target.value
                                            )
                                        }
                                      />
                                    </label>

                                    <label>
                                      Word Limit

                                      <input
                                        type="number"
                                        min="0"
                                        value={
                                          editWordLimit
                                        }
                                        onChange={
                                          event =>
                                            setEditWordLimit(
                                              event.target.value
                                            )
                                        }
                                      />
                                    </label>

                                    <div
                                      style={{
                                        display: 'flex',
                                        gap: '6px',
                                        alignItems: 'end',
                                        flexWrap: 'wrap'
                                      }}
                                    >
                                      <button
                                        type="button"
                                        className="primary-btn"
                                        disabled={
                                          isBusy
                                        }
                                        onClick={() =>
                                          void saveAppearanceEdit(
                                            item,
                                            appearance
                                          )
                                        }
                                      >
                                        {isBusy
                                          ? 'Saving...'
                                          : 'Save'}
                                      </button>

                                      <button
                                        type="button"
                                        className="secondary-btn"
                                        disabled={
                                          isBusy
                                        }
                                        onClick={
                                          cancelEditAppearance
                                        }
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )
                      ) : (
                        <small
                          style={{
                            color: '#94a3b8'
                          }}
                        >
                          No canonical appearance is linked yet.
                        </small>
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            {visibleQuestions.length === 0 && (
              <p>
                No Mains PYQs match the current filters.
              </p>
            )}
          </div>
        )}
      </section>
    </section>
  );
}

export default MainsPyqManager;
