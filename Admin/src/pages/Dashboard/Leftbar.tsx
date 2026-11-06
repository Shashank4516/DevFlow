import React, { useCallback, useEffect, useRef, useState } from "react";
import classnames from "classnames";
import { TabContent, TabPane } from "reactstrap";

// hooks
import { useRedux } from "../../hooks/index";
import { createSelector } from "reselect";
// constants
import { TABS } from "../../constants/index";

// component
import ProfileSearch from "../../components/ProfileSearch";
import Profile from "./Profile/index";
import Chats from "./Chats/index";
import Calls from "./Calls/index";
import Bookmark from "./Bookmark/index";
import Notifications from "./Notifications/index";
import Settings from "./Settings/index";
import Stack from "./Stack/index";

const DEFAULT_WIDTH = 300;
const MAX_WIDTH = 520;
const SIDE_MENU_WIDTH = 75;
// The chat next to it always keeps at least this much room.
const MIN_CHAT_WIDTH = 480;
const KEY_STEP = 20;
const STORAGE_KEY = "devflow_notifications_width";
const DESKTOP_QUERY = "(min-width: 992px)";

const clampWidth = (width: number) =>
  Math.round(
    Math.max(
      DEFAULT_WIDTH,
      Math.min(width, MAX_WIDTH, window.innerWidth - SIDE_MENU_WIDTH - MIN_CHAT_WIDTH),
    ),
  );

const readSavedWidth = () => {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    return saved > 0 ? saved : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
};

const saveWidth = (width: number) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    // The column simply goes back to its default size next time.
  }
};

interface LeftbarProps {
  onOpenSearch: () => void;
}
const Leftbar = ({ onOpenSearch }: LeftbarProps) => {
  // global store
  const { useAppSelector } = useRedux();

  // const { activeTab } = useAppSelector(state => ({
  //   activeTab: state.Layout.activeTab,
  // }));
  const errorData = createSelector(
    (state : any) => state.Layout,
    (state) => ({
      activeTab: state.activeTab,
    })
  );
  // Inside your component
  const { activeTab} = useAppSelector(errorData);

  const hideSidebar = activeTab === TABS.GITHUB;

  /*
  drag the right edge to resize the column, on the Notifications tab
  */
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [savedWidth, setSavedWidth] = useState(readSavedWidth);
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  const [, setWindowWidth] = useState(window.innerWidth);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const onResize = () => {
      setIsDesktop(window.matchMedia(DESKTOP_QUERY).matches);
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isResizable = activeTab === TABS.NOTIFICATIONS && isDesktop;
  // Re-checked on every render, so that a smaller window always leaves the chat room.
  const width = clampWidth(savedWidth);

  const applyWidth = useCallback((next: number) => {
    const clamped = clampWidth(next);
    setSavedWidth(clamped);
    saveWidth(clamped);
  }, []);

  const onHandlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };
  const onHandlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !sidebarRef.current) return;
    setSavedWidth(clampWidth(event.clientX - sidebarRef.current.getBoundingClientRect().left));
  };
  const onHandlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    saveWidth(width);
  };
  const onHandleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: width - KEY_STEP,
      ArrowRight: width + KEY_STEP,
      Home: DEFAULT_WIDTH,
      End: MAX_WIDTH,
    };
    if (event.key in moves) {
      event.preventDefault();
      applyWidth(moves[event.key]);
    }
  };

  return (
    <>
      {/* start chat-leftsidebar — hidden on GitHub tab so the code workspace uses full width */}
      <div
        ref={sidebarRef}
        className={classnames("chat-leftsidebar", hideSidebar && "d-none", {
          "is-resizing": isDragging,
        })}
        aria-hidden={hideSidebar}
        style={isResizable ? { width, minWidth: width, maxWidth: width } : undefined}
      >
        {isResizable && (
          <div
            className="chat-leftsidebar__resizer"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize notifications"
            aria-valuemin={DEFAULT_WIDTH}
            aria-valuemax={MAX_WIDTH}
            aria-valuenow={width}
            tabIndex={0}
            title="Drag to resize. Double-click to reset."
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
            onDoubleClick={() => applyWidth(DEFAULT_WIDTH)}
            onKeyDown={onHandleKeyDown}
          />
        )}
        {activeTab !== TABS.STACK && <ProfileSearch onOpen={onOpenSearch} />}
        <TabContent activeTab={activeTab}>
          {/* Start Profile tab-pane */}
          <TabPane
            tabId={TABS.USERS}
            role="tabpanel"
          >
            <Profile />
          </TabPane>

          <TabPane
            tabId={TABS.CHAT}
            role="tabpanel"
          >
            <Chats />
          </TabPane>

          <TabPane
            tabId={TABS.CALLS}
            role="tabpanel"
          >
            <Calls />
          </TabPane>

          <TabPane
            tabId={TABS.NOTIFICATIONS}
            role="tabpanel"
          >
            <Notifications />
          </TabPane>

          <TabPane
            tabId={TABS.BOOKMARK}
            role="tabpanel"
          >
            <Bookmark />
          </TabPane>

          <TabPane tabId={TABS.GITHUB} role="tabpanel" />

          <TabPane
            tabId={TABS.STACK}
            role="tabpanel"
          >
            <Stack />
          </TabPane>

          <TabPane
            tabId={TABS.SETTINGS}
            role="tabpanel"
          >
            <Settings />
          </TabPane>
        </TabContent>
      </div>
    </>
  );
};

export default Leftbar;
