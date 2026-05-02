import React, { useEffect } from "react";
import {
  Modal,
  ModalBody,
  ModalHeader,
} from "reactstrap";
import { createSelector } from "reselect";

import AppSimpleBar from "./AppSimpleBar";
import Loader from "./Loader";
import BookMark from "../pages/Dashboard/Bookmark/BookMark";
import { useRedux } from "../hooks";
import {
  getBookmarks,
  createBookmark,
  deleteBookmark,
  updateBookmark,
} from "../redux/actions";
import type { BookMarkTypes } from "../data/bookmarks";

interface AddPinnedTabModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const selectBookmarkModalState = createSelector(
  (state: any) => state.Bookmarks,
  (b: any) => ({
    bookmarks: (b?.bookmarks || []) as BookMarkTypes[],
    getBookmarksLoading: !!b?.getBookmarksLoading,
    isBookmarkCreated: !!b?.isBookmarkCreated,
    isBookmarkDeleted: !!b?.isBookmarkDeleted,
    isBookmarkUpdated: !!b?.isBookmarkUpdated,
  })
);

const AddPinnedTabModal = ({ isOpen, onClose }: AddPinnedTabModalProps) => {
  const { dispatch, useAppSelector } = useRedux();

  const {
    bookmarks,
    getBookmarksLoading,
    isBookmarkCreated,
    isBookmarkDeleted,
    isBookmarkUpdated,
  } = useAppSelector(selectBookmarkModalState);

  const count = Array.isArray(bookmarks) ? bookmarks.length : 0;

  useEffect(() => {
    if (!isOpen) return;
    dispatch(getBookmarks());
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (!isOpen) return;
    if (isBookmarkCreated || isBookmarkDeleted || isBookmarkUpdated) {
      dispatch(getBookmarks());
    }
  }, [dispatch, isOpen, isBookmarkCreated, isBookmarkDeleted, isBookmarkUpdated]);

  const onPin = () => {
    const title = window.prompt("Bookmark title");
    if (!title || !title.trim()) return;
    const desc = window.prompt("Bookmark description or URL (optional)") || "";
    const d = desc.trim();
    dispatch(
      createBookmark({
        icon: d.startsWith("http") ? "bx bx-pin" : "bx bx-file",
        title: title.trim(),
        desc: d,
      })
    );
  };

  const onUpdate = (id: number, data: BookMarkTypes) => {
    dispatch(updateBookmark(id, data));
  };

  const onDelete = (id: number) => {
    dispatch(deleteBookmark(id));
  };

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      className="pinnedtabModal"
      tabIndex={-1}
      contentClassName="shadow-lg border-0"
      centered
      scrollable
    >
      <ModalBody className="p-0 ">
        <ModalHeader toggle={onClose} className="bg-primary">
          <div className="modal-title modal-title-custom text-white bg-primary font-size-16">
            BookMark
          </div>
        </ModalHeader>
        <div className="modal-body p-4 position-relative">
          {getBookmarksLoading && bookmarks.length === 0 && (
            <div className="py-5">
              <Loader />
            </div>
          )}
          <div className="d-flex align-items-center mb-3">
            <div className="flex-grow-1">
              <h5 className="font-size-16 mb-0">
                {count} pinned tab{count === 1 ? "" : "s"}
              </h5>
            </div>
            <div className="flex-shrink-0">
              <button type="button" className="btn btn-sm btn-soft-primary" onClick={onPin}>
                <i className="bx bx-plus"></i> Pin
              </button>
            </div>
          </div>
          <AppSimpleBar
            style={{ maxHeight: "299px" }}
            className="chat-bookmark-list mx-n4"
          >
            <ul className="list-unstyled chat-list">
              {bookmarks.length === 0 && !getBookmarksLoading ? (
                <li className="px-3 py-4 text-muted text-center small">
                  No bookmarks yet. Tap <strong>+ Pin</strong> to add one.
                </li>
              ) : (
                bookmarks.map((bookmark: BookMarkTypes) => (
                  <BookMark
                    key={bookmark.id}
                    bookmark={bookmark}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))
              )}
            </ul>
          </AppSimpleBar>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default AddPinnedTabModal;
