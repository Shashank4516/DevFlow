import React, { useEffect, useState } from "react";
import { Button } from "reactstrap";

// hooks
import { useRedux } from "../../../hooks/index";
import { createSelector } from "reselect";
// actions
import {
  getBookmarks,
  createBookmark,
  deleteBookmark,
  updateBookmark,
} from "../../../redux/actions";

// components
import Loader from "../../../components/Loader";
import AppSimpleBar from "../../../components/AppSimpleBar";
import LeftbarTitle from "../../../components/LeftbarTitle";
import BookMark from "./BookMark";

// interface
import { BookMarkTypes } from "../../../data/bookmarks";

interface IndexProps {}
const Index = (props: IndexProps) => {
  // global store
  const { dispatch, useAppSelector } = useRedux();

  // const {
  //   bookmarksList,
  //   getBookmarksLoading,
  //   isBookmarkDeleted,
  //   isBookmarkUpdated,
  // } = useAppSelector(state => ({
  //   bookmarksList: state.Bookmarks.bookmarks,
  //   getBookmarksLoading: state.Bookmarks.getBookmarksLoading,
  //   isBookmarkDeleted: state.Bookmarks.isBookmarkDeleted,
  //   isBookmarkUpdated: state.Bookmarks.isBookmarkUpdated,
  // }));


  const errorData = createSelector(
    (state : any) => state.Bookmarks,
    (state) => ({
      bookmarksList: state.bookmarks,
      getBookmarksLoading: state.getBookmarksLoading,
      isBookmarkCreated: state.isBookmarkCreated,
      isBookmarkDeleted: state.isBookmarkDeleted,
      isBookmarkUpdated: state.isBookmarkUpdated,
    })
  );
  // Inside your component
  const {
    bookmarksList,
    getBookmarksLoading,
    isBookmarkCreated,
    isBookmarkDeleted,
    isBookmarkUpdated,
  } = useAppSelector(errorData);

  /*
  get bookmarks
  */
  useEffect(() => {
    dispatch(getBookmarks());
  }, [dispatch]);

  const [bookmarks, setBookmarks] = useState<BookMarkTypes[]>([]);
  useEffect(() => {
    setBookmarks(bookmarksList);
  }, [bookmarksList]);

  /*
  update bookmark
  */
  const onUpdate = (id: number, data: BookMarkTypes) => {
    dispatch(updateBookmark(id, data));
  };

  /*
  delete bookmark
  */
  const onDelete = (id: number) => {
    dispatch(deleteBookmark(id));
  };

  const onCreate = () => {
    const title = window.prompt("Bookmark title");
    if (!title || !title.trim()) return;
    const desc = window.prompt("Bookmark description or URL (optional)") || "";
    dispatch(
      createBookmark({
        icon: desc.startsWith("http") ? "bx bx-pin" : "bx bx-file",
        title: title.trim(),
        desc: desc.trim(),
      })
    );
  };

  useEffect(() => {
    if (isBookmarkCreated || isBookmarkDeleted || isBookmarkUpdated) {
      dispatch(getBookmarks());
    }
  }, [dispatch, isBookmarkCreated, isBookmarkDeleted, isBookmarkUpdated]);

  return (
    <div className="position-relative">
      {getBookmarksLoading && <Loader />}
      <div className="d-flex align-items-center justify-content-between">
        <LeftbarTitle title="Bookmark" />
        <Button color="primary" size="sm" className="me-3" onClick={onCreate}>
          Add
        </Button>
      </div>
      <AppSimpleBar className="chat-message-list chat-bookmark-list">
        <ul className="list-unstyled chat-list">
          {(bookmarks || []).map((bookmark: BookMarkTypes, key: number) => (
            <BookMark
              key={key}
              bookmark={bookmark}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </AppSimpleBar>
    </div>
  );
};

export default Index;
