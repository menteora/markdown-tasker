import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '../types';

const SETTINGS_KEY = 'md-tasker-email-settings';

const DEFAULT_SETTINGS: Settings = {
  senderAlias: null,
  emailSubject: 'Task Update for project: {projectTitle}',
  emailPreamble: 'Hi {userName},\n\nThis is a friendly reminder about your outstanding tasks for the project. Please see the list below:',
  emailPostamble: 'Please provide an update when you can.\n\nBest regards,',
  emailSignature: '{senderName}',
  reminderMessage: 'Reminder sent.',
  ccAlias: null,
};

export const useSettings = (): [Settings, (newSettings: Partial<Settings>) => void] => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) });
      }
    } catch (error) {
      console.error('Failed to load settings from localStorage', error);
      setSettings(DEFAULT_SETTINGS);
    }
  }, []);

  const saveSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettings(prev => {
      const updatedSettings = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
      } catch (error) {
        console.error('Failed to save settings to localStorage', error);
      }
      return updatedSettings;
    });
  }, []);

  return [settings, saveSettings];
};