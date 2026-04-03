import {
  type FC,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  type BackupStatus,
  getFolderName,
  hasFolderLinked,
  selectFolder,
  syncToFolder,
  syncToLocalAndIDB,
  tryRelinkFolder,
} from "../utils/monarchStorage";

interface BackupContextValue {
  status: BackupStatus;
  lastSavedAt: number | null;
  fileLinked: boolean;
  folderLinked: boolean;
  folderName: string;
  folderUnreachable: boolean;
  triggerSync: () => void;
  triggerFullSync: () => Promise<void>;
  linkFileAndSync: () => Promise<void>;
  linkFolderAndSync: () => Promise<void>;
}

const BackupContext = createContext<BackupContextValue>({
  status: "no-file",
  lastSavedAt: null,
  fileLinked: false,
  folderLinked: false,
  folderName: "",
  folderUnreachable: false,
  triggerSync: () => {},
  triggerFullSync: async () => {},
  linkFileAndSync: async () => {},
  linkFolderAndSync: async () => {},
});

export const BackupProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<BackupStatus>("no-file");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [folderLinked, setFolderLinked] = useState<boolean>(hasFolderLinked());
  const [folderName, setFolderName] = useState<string>(getFolderName());
  const [folderUnreachable, setFolderUnreachable] = useState(false);

  // On mount, try to relink stored folder handle
  useEffect(() => {
    tryRelinkFolder().then((result) => {
      if (result === "linked") {
        setFolderLinked(true);
        setFolderName(getFolderName());
        setFolderUnreachable(false);
      } else if (result === "unreachable") {
        setFolderUnreachable(true);
        setFolderLinked(false);
      }
      // 'none' = no stored handle, do nothing
    });
  }, []);

  const triggerSync = useCallback(() => {
    syncToFolder((s) => {
      setStatus(s);
      if (s === "saved") setLastSavedAt(Date.now());
    }).catch(() => setStatus("error"));
  }, []);

  const triggerFullSync = useCallback(async () => {
    setStatus("saving");
    try {
      await syncToLocalAndIDB();
      await syncToFolder((s) => {
        if (s !== "no-file") setStatus(s);
      });
      setStatus("saved");
      setLastSavedAt(Date.now());
    } catch {
      setStatus("error");
    }
  }, []);

  const linkFolderAndSync = useCallback(async () => {
    const success = await selectFolder();
    if (success) {
      setFolderLinked(true);
      setFolderName(getFolderName());
      setFolderUnreachable(false);
      triggerSync();
    }
  }, [triggerSync]);

  // Backward-compat alias
  const linkFileAndSync = linkFolderAndSync;

  return (
    <BackupContext.Provider
      value={{
        status,
        lastSavedAt,
        fileLinked: folderLinked,
        folderLinked,
        folderName,
        folderUnreachable,
        triggerSync,
        triggerFullSync,
        linkFileAndSync,
        linkFolderAndSync,
      }}
    >
      {children}
    </BackupContext.Provider>
  );
};

export function useBackup() {
  return useContext(BackupContext);
}
