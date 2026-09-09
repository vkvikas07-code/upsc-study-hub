import {
  useEffect,
  useState
} from 'react';

import {
  supabase
} from '../lib/supabase';


type Props = {
  questionId: string;
};


export function PrelimsBookmarkButton({
  questionId
}: Props) {

  const [
    bookmarkId,
    setBookmarkId
  ] =
    useState<string | null>(
      null
    );


  const [
    loading,
    setLoading
  ] =
    useState(true);


  const [
    saving,
    setSaving
  ] =
    useState(false);


  const [
    message,
    setMessage
  ] =
    useState('');


  /*
   * CHECK WHETHER THIS
   * QUESTION IS BOOKMARKED
   */

  async function loadBookmark() {

    if (!supabase) {

      setLoading(false);

      return;
    }


    setLoading(true);

    setMessage('');


    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setBookmarkId(null);

      setLoading(false);

      return;
    }


    const {
      data,
      error
    } =
      await supabase
        .from(
          'bookmarks'
        )
        .select(
          'id'
        )
        .eq(
          'user_id',
          user.id
        )
        .eq(
          'content_type',
          'prelims_question'
        )
        .eq(
          'content_id',
          questionId
        )
        .maybeSingle();


    if (error) {

      console.error(
        'Unable to load bookmark:',
        error
      );

      setLoading(false);

      return;
    }


    setBookmarkId(
      data?.id || null
    );


    setLoading(false);
  }


  useEffect(
    () => {

      loadBookmark();

    },
    [
      questionId
    ]
  );


  /*
   * TOGGLE BOOKMARK
   */

  async function toggleBookmark() {

    if (
      !supabase ||
      saving
    ) {

      return;
    }


    setSaving(true);

    setMessage('');


    const {
      data: {
        user
      }
    } =
      await supabase
        .auth
        .getUser();


    if (!user) {

      setMessage(
        'Sign in to save questions.'
      );

      setSaving(false);

      return;
    }


    /*
     * REMOVE BOOKMARK
     */

    if (bookmarkId) {

      const {
        error
      } =
        await supabase
          .from(
            'bookmarks'
          )
          .delete()
          .eq(
            'id',
            bookmarkId
          )
          .eq(
            'user_id',
            user.id
          );


      if (error) {

        console.error(
          'Unable to remove bookmark:',
          error
        );

        setMessage(
          'Unable to remove bookmark.'
        );

        setSaving(false);

        return;
      }


      setBookmarkId(null);

      setMessage(
        'Removed from revision.'
      );

      setSaving(false);

      return;
    }


    /*
     * ADD BOOKMARK
     */

    const {
      data,
      error
    } =
      await supabase
        .from(
          'bookmarks'
        )
        .insert({

          user_id:
            user.id,

          content_type:
            'prelims_question',

          content_id:
            questionId
        })
        .select(
          'id'
        )
        .single();


    if (
      error ||
      !data
    ) {

      console.error(
        'Unable to save bookmark:',
        error
      );

      setMessage(
        'Unable to save question.'
      );

      setSaving(false);

      return;
    }


    setBookmarkId(
      data.id
    );


    setMessage(
      'Saved for revision.'
    );


    setSaving(false);
  }


  return (

    <div
      style={{
        display:
          'flex',

        alignItems:
          'center',

        gap:
          '10px',

        flexWrap:
          'wrap'
      }}
    >

      <button
        type="button"
        className={
          bookmarkId
            ? 'primary-btn'
            : 'secondary-btn'
        }
        onClick={
          toggleBookmark
        }
        disabled={
          loading ||
          saving
        }
      >

        {
          loading

            ? 'Checking...'

            : saving

            ? 'Saving...'

            : bookmarkId

            ? '★ Saved for Revision'

            : '☆ Save for Revision'
        }

      </button>


      {message && (

        <small>
          {message}
        </small>

      )}

    </div>
  );
}
