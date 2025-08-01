import clsx from 'clsx';
import React, { useEffect, useState } from 'react';

import { Book } from '@/types/book';
import { BookMetadata } from '@/libs/document';
import { useEnv } from '@/context/EnvContext';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { useMetadataEdit } from './useMetadataEdit';
import Alert from '@/components/Alert';
import Dialog from '@/components/Dialog';
import Spinner from '@/components/Spinner';
import BookDetailView from './BookDetailView';
import BookDetailEdit from './BookDetailEdit';
import SourceSelector from './SourceSelector';

interface BookDetailModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
  handleBookDownload?: (book: Book) => void;
  handleBookUpload?: (book: Book) => void;
  handleBookDelete?: (book: Book) => void;
  handleBookDeleteCloudBackup?: (book: Book) => void;
  handleBookMetadataUpdate?: (book: Book, updatedMetadata: BookMetadata) => void;
}

const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  isOpen,
  onClose,
  handleBookDownload,
  handleBookUpload,
  handleBookDelete,
  handleBookDeleteCloudBackup,
  handleBookMetadataUpdate,
}) => {
  const _ = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showDeleteCloudBackupAlert, setShowDeleteCloudBackupAlert] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [bookMeta, setBookMeta] = useState<BookMetadata | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const { envConfig } = useEnv();
  const { settings } = useSettingsStore();

  // Initialize metadata edit hook
  const {
    editedMeta,
    fieldSources,
    lockedFields,
    fieldErrors,
    searchLoading,
    showSourceSelection,
    availableSources,
    handleFieldChange,
    handleToggleFieldLock,
    handleLockAll,
    handleUnlockAll,
    handleAutoRetrieve,
    handleSourceSelection,
    handleCloseSourceSelection,
    resetToOriginal,
  } = useMetadataEdit(bookMeta);

  useEffect(() => {
    const loadingTimeout = setTimeout(() => setLoading(true), 300);
    const fetchBookDetails = async () => {
      const appService = await envConfig.getAppService();
      try {
        const details = book.metadata || (await appService.fetchBookDetails(book, settings));
        setBookMeta(details);
        const size = await appService.getBookFileSize(book);
        setFileSize(size);
      } finally {
        if (loadingTimeout) clearTimeout(loadingTimeout);
        setLoading(false);
      }
    };
    fetchBookDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  const handleClose = () => {
    setBookMeta(null);
    setEditMode(false);
    onClose();
  };

  const handleEditMetadata = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    resetToOriginal();
    setEditMode(false);
  };

  const handleSaveMetadata = () => {
    if (editedMeta && handleBookMetadataUpdate) {
      setBookMeta(editedMeta);
      handleBookMetadataUpdate(book, editedMeta);
      setEditMode(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteAlert(true);
  };

  const handleDeleteCloudBackup = () => {
    setShowDeleteCloudBackupAlert(true);
  };

  const confirmDelete = async () => {
    handleClose();
    setShowDeleteAlert(false);
    if (handleBookDelete) {
      handleBookDelete(book);
    }
  };

  const confirmDeleteCloudBackup = async () => {
    handleClose();
    setShowDeleteCloudBackupAlert(false);
    if (handleBookDeleteCloudBackup) {
      handleBookDeleteCloudBackup(book);
    }
  };

  const handleRedownload = async () => {
    handleClose();
    if (handleBookDownload) {
      handleBookDownload(book);
    }
  };

  const handleReupload = async () => {
    handleClose();
    if (handleBookUpload) {
      handleBookUpload(book);
    }
  };

  if (!bookMeta)
    return (
      loading && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          <Spinner loading />
        </div>
      )
    );

  return (
    <>
      <div className='fixed inset-0 z-50 flex items-center justify-center'>
        <Dialog
          title={editMode ? _('Edit Metadata') : _('Book Details')}
          isOpen={isOpen}
          onClose={handleClose}
          bgClassName='sm:bg-black/50'
          boxClassName={clsx(
            editMode ? 'sm:min-w-[600px] sm:max-w-[600px]' : 'sm:min-w-[480px] sm:max-w-[480px]',
            'sm:h-auto sm:max-h-[90%]',
          )}
          contentClassName='!px-6 !py-4'
        >
          <div className='flex w-full select-text items-start justify-center'>
            {editMode ? (
              <BookDetailEdit
                book={book}
                metadata={editedMeta}
                fieldSources={fieldSources}
                lockedFields={lockedFields}
                fieldErrors={fieldErrors}
                searchLoading={searchLoading}
                onFieldChange={handleFieldChange}
                onToggleFieldLock={handleToggleFieldLock}
                onAutoRetrieve={handleAutoRetrieve}
                onLockAll={handleLockAll}
                onUnlockAll={handleUnlockAll}
                onCancel={handleCancelEdit}
                onReset={resetToOriginal}
                onSave={handleSaveMetadata}
              />
            ) : (
              <BookDetailView
                book={book}
                metadata={bookMeta}
                fileSize={fileSize}
                onEdit={handleBookMetadataUpdate ? handleEditMetadata : undefined}
                onDelete={handleBookDelete ? handleDelete : undefined}
                onDeleteCloudBackup={
                  handleBookDeleteCloudBackup ? handleDeleteCloudBackup : undefined
                }
                onDownload={handleBookDownload ? handleRedownload : undefined}
                onUpload={handleBookUpload ? handleReupload : undefined}
              />
            )}
          </div>
        </Dialog>

        {/* Source Selection Modal */}
        <SourceSelector
          sources={availableSources}
          isOpen={showSourceSelection}
          onSelect={handleSourceSelection}
          onClose={handleCloseSourceSelection}
        />

        {/* Delete Alerts */}
        {showDeleteAlert && (
          <div
            className={clsx(
              'fixed bottom-0 left-0 right-0 z-50 flex justify-center',
              'pb-[calc(env(safe-area-inset-bottom)+16px)]',
            )}
          >
            <Alert
              title={_('Confirm Deletion')}
              message={_('Are you sure to delete the selected book?')}
              onCancel={() => setShowDeleteAlert(false)}
              onConfirm={confirmDelete}
            />
          </div>
        )}
        {showDeleteCloudBackupAlert && (
          <div
            className={clsx(
              'fixed bottom-0 left-0 right-0 z-50 flex justify-center',
              'pb-[calc(env(safe-area-inset-bottom)+16px)]',
            )}
          >
            <Alert
              title={_('Confirm Deletion')}
              message={_('Are you sure to delete the cloud backup of the selected book?')}
              onCancel={() => setShowDeleteCloudBackupAlert(false)}
              onConfirm={confirmDeleteCloudBackup}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default BookDetailModal;
