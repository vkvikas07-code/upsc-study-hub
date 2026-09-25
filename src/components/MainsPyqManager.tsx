

                                      <div
                                        style={{
                                          display:
                                            'flex',
                                          gap:
                                            '8px',
                                          flexWrap:
                                            'wrap'
                                        }}
                                      >

                                        <button
                                          type="button"
                                          className="primary-btn"
                                          disabled={
                                            isWorking
                                          }
                                          onClick={() =>
                                            void saveAppearanceEdit(
                                              item
                                            )
                                          }
                                        >
                                          {isWorking
                                            ? 'Saving...'
                                            : 'Save Appearance'}
                                        </button>


                                        <button
                                          type="button"
                                          className="secondary-btn"
                                          disabled={
                                            isWorking
                                          }
                                          onClick={
                                            resetAppearanceEditor
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

                        ) : loadingAppearanceId ===
                          item.id ? (

                          <small
                            style={{
                              color:
                                '#94a3b8'
                            }}
                          >
                            Loading...
                          </small>

                        ) : (

                          <small
                            style={{
                              color:
                                '#94a3b8'
                            }}
                          >
                            No canonical appearances are linked yet.
                          </small>

                        )}

                      </div>

                    )}

                  </article>

                )
              )}


            {visibleQuestions.length ===
              0 && (

              <p>
                No PYQs match the current filters.
              </p>

            )}

          </div>

        )}

      </section>

    </section>

  );
}


export default MainsPyqManager;
