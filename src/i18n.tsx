import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';


export type AppLanguage =
  | 'en'
  | 'hi'
  | 'mr';


type TranslationKey =
  | 'home'
  | 'learn'
  | 'practice'
  | 'current'
  | 'me'
  | 'adminStudio'
  | 'tagline'
  | 'quickNavigation'
  | 'openMenu'
  | 'closeMenu'
  | 'notifications'
  | 'language'
  | 'english'
  | 'hindi'
  | 'marathi';


const TRANSLATIONS:
  Record<
    AppLanguage,
    Record<
      TranslationKey,
      string
    >
  > = {

  en: {
    home:
      'Home',

    learn:
      'Learn',

    practice:
      'Practice',

    current:
      'Current',

    me:
      'Me',

    adminStudio:
      'Admin Studio',

    tagline:
      'Learn. Practice. Progress.',

    quickNavigation:
      'Quick navigation',

    openMenu:
      'Open menu',

    closeMenu:
      'Close menu',

    notifications:
      'Notifications',

    language:
      'Language',

    english:
      'English',

    hindi:
      'हिंदी',

    marathi:
      'मराठी'
  },


  hi: {
    home:
      'होम',

    learn:
      'अध्ययन',

    practice:
      'अभ्यास',

    current:
      'समसामयिकी',

    me:
      'मेरी प्रोफ़ाइल',

    adminStudio:
      'एडमिन स्टूडियो',

    tagline:
      'सीखें। अभ्यास करें। आगे बढ़ें।',

    quickNavigation:
      'त्वरित नेविगेशन',

    openMenu:
      'मेनू खोलें',

    closeMenu:
      'मेनू बंद करें',

    notifications:
      'सूचनाएँ',

    language:
      'भाषा',

    english:
      'English',

    hindi:
      'हिंदी',

    marathi:
      'मराठी'
  },


  mr: {
    home:
      'मुख्यपृष्ठ',

    learn:
      'अभ्यासक्रम',

    practice:
      'सराव',

    current:
      'चालू घडामोडी',

    me:
      'माझे खाते',

    adminStudio:
      'अॅडमिन स्टुडिओ',

    tagline:
      'शिका. सराव करा. प्रगती करा.',

    quickNavigation:
      'जलद नेव्हिगेशन',

    openMenu:
      'मेनू उघडा',

    closeMenu:
      'मेनू बंद करा',

    notifications:
      'सूचना',

    language:
      'भाषा',

    english:
      'English',

    hindi:
      'हिंदी',

    marathi:
      'मराठी'
  }

};


type LanguageContextValue = {

  language:
    AppLanguage;

  setLanguage:
    (
      language:
        AppLanguage
    ) =>
      void;

  t:
    (
      key:
        TranslationKey
    ) =>
      string;
};


const LanguageContext =
  createContext<
    LanguageContextValue |
    null
  >(
    null
  );


const STORAGE_KEY =
  'upsc-study-hub-language';


function loadInitialLanguage():
  AppLanguage {

  try {

    const stored =
      localStorage.getItem(
        STORAGE_KEY
      );


    if (
      stored ===
        'en' ||
      stored ===
        'hi' ||
      stored ===
        'mr'
    ) {

      return stored;
    }

  } catch {

    // Ignore storage errors.
  }


  return 'en';
}


export function LanguageProvider({
  children
}: {
  children:
    ReactNode;
}) {

  const [
    language,
    setLanguageState
  ] =
    useState<
      AppLanguage
    >(
      loadInitialLanguage
    );


  function setLanguage(
    next:
      AppLanguage
  ) {

    setLanguageState(
      next
    );


    try {

      localStorage.setItem(
        STORAGE_KEY,
        next
      );

    } catch {

      // Ignore storage errors.
    }
  }


  useEffect(
    () => {

      document.documentElement.lang =
        language;

    },
    [
      language
    ]
  );


  const value =
    useMemo<
      LanguageContextValue
    >(
      () => ({

        language,

        setLanguage,

        t:
          (
            key:
              TranslationKey
          ) =>
            TRANSLATIONS[
              language
            ][
              key
            ]

      }),
      [
        language
      ]
    );


  return (

    <LanguageContext.Provider
      value={
        value
      }
    >

      {
        children
      }

    </LanguageContext.Provider>

  );
}


export function useLanguage():
  LanguageContextValue {

  const context =
    useContext(
      LanguageContext
    );


  if (
    !context
  ) {

    throw new Error(
      'useLanguage must be used inside LanguageProvider.'
    );
  }


  return context;
}
