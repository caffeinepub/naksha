import {
  type FC,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import {
  type BackupStatus,
  hasLinkedFile,
  linkFile,
  syncToFile,
  syncToLocalAndIDB,
} from "../utils/monarchStorage";

interface BackupContextValue {
  status: BackupStatus;
  lastSavedAt: number | null;
  fileLinked: boolean;
  triggerSync: () => void;
  triggerFullSync: () => Promise<void>;
  linkFileAndSync: () => Promise<void>;
}

const BackupContext = createContext<BackupContextValue>({
  status: "no-file",
  lastSavedAt: null,
  fileLinked: false,
  triggerSync: () => {},
  triggerFullSync: async () => {},
  linkFileAndSync: async () => {},
});

export const BackupProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<BackupStatus>("no-file");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [fileLinked, setFileLinked] = useState<boolean>(hasLinkedFile());

  const triggerSync = useCallback(() => {
    syncToFile((s) => {
      setStatus(s);
      if (s === "saved") setLastSavedAt(Date.now());
    }).catch(() => setStatus("error"));
  }, []);

  const triggerFullSync = useCallback(async () => {
    setStatus("saving");
    try {
      await syncToLocalAndIDB();
      await syncToFile((s) => {
        if (s !== "no-file") setStatus(s);
      });
      setStatus("saved");
      setLastSavedAt(Date.now());
    } catch {
      setStatus("error");
    }
  }, []);

  const linkFileAndSync = useCallback(async () => {
    const success = await linkFile();
    if (success) {
      setFileLinked(true);
      triggerSync();
    }
  }, [triggerSync]);

  return (
    <BackupContext.Provider
      value={{
        status,
        lastSavedAt,
        fileLinked,
        triggerSync,
        triggerFullSync,
        linkFileAndSync,
      }}
    >
      {children}
    </BackupContext.Provider>
  );
};

export function useBackup() {
  return useContext(BackupContext);
}
