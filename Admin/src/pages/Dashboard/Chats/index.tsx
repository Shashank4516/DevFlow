import React, { useEffect, useMemo, useState } from "react";
import { createSelector } from "reselect";
import { Link } from "react-router-dom";
// hooks
import { useRedux } from "../../../hooks/index";

// actions
import {
  getFavourites,
  getDirectMessages,
  getChannels,
  createChannel,
  changeSelectedChat,
  getChatUserDetails,
  setChatUserDetails,
  getChatUserConversations,
  getChannelDetails,
  getArchiveContact,
  readConversation,
  toggleFavouriteContact,
} from "../../../redux/actions";

// interfaces
import { CreateChannelPostData } from "../../../redux/actions";

// components
import AppSimpleBar from "../../../components/AppSimpleBar";
import AddGroupModal from "../../../components/AddGroupModal";

import Favourites from "./Favourites";
import DirectMessages from "./DirectMessages";
import Chanels from "./Chanels";
import Archive from "./Archive";
import { CHATS_TABS } from "../../../constants";

interface IndexProps {}
const Index = (props: IndexProps) => {
  // global store
  const { dispatch, useAppSelector } = useRedux();

  const errorData = createSelector(
    (state : any) => state.Contacts,
    (props : any) => props.Chats,
    (state,props) => ({
        favourites: props.favourites,
        directMessages: props.directMessages,
        channels: props.channels,
        isChannelCreated: props.isChannelCreated,
        selectedChat: props.selectedChat,
        isFavouriteContactToggled: props.isFavouriteContactToggled,
        archiveContacts: props.archiveContacts,
        isContactArchiveToggled: props.isContactArchiveToggled,
        chatUserDetails:props.chatUserDetails,
    })
  );

  // Inside your component
  const {favourites, directMessages, channels, isChannelCreated, selectedChat, isFavouriteContactToggled,
    archiveContacts, isContactArchiveToggled, chatUserDetails} = useAppSelector(errorData);
  
  // get data

  useEffect(() => {
    dispatch(getFavourites());
    dispatch(getDirectMessages());
    dispatch(getChannels());
  }, [dispatch]);
  useEffect(() => {
    if (isFavouriteContactToggled) {
      dispatch(getFavourites());
      dispatch(getDirectMessages());
    }
  }, [dispatch, isFavouriteContactToggled]);

  /*
  channel creation handeling
  */
  const [isOpenCreateChannel, setIsOpenCreateChannel] =
    useState<boolean>(false);
  const openCreateChannelModal = () => {
    setIsOpenCreateChannel(true);
  };
  const closeCreateChannelModal = () => {
    setIsOpenCreateChannel(false);
  };
  const onCreateChannel = (channelData: CreateChannelPostData) => {
    dispatch(createChannel(channelData));
  };
  useEffect(() => {
    if (isChannelCreated) {
      setIsOpenCreateChannel(false);
      dispatch(getChannels());
    }
  }, [dispatch, isChannelCreated]);

  /*
  select chat handeling :
    get conversations
    get chat user details
  */

  const onSelectChat = (id: string | number, isChannel?: boolean) => {
    if (isChannel) {
      dispatch(getChannelDetails(id));
      dispatch(changeSelectedChat(id));
      return;
    } else {
      // Prefer using the already-loaded user object so the header has profileImage immediately.
      const allUsers = [...(favourites || []), ...(directMessages || [])];
      const selected = allUsers.find((u: any) => u?.id + "" === id + "");
      if (selected) dispatch(setChatUserDetails(selected));
      else dispatch(getChatUserDetails(id));
    }
    dispatch(readConversation(id));
    dispatch(getChatUserConversations(id));
    dispatch(changeSelectedChat(id));
  };

  /*
  tab handeling
  */
  const [active, setActive] = useState(CHATS_TABS.DEFAULT);
  const onChangeTab = (tab: CHATS_TABS) => {
    setActive(tab);
  };

  /*
  archive contacts
  */
  useEffect(() => {
    dispatch(getArchiveContact());
  }, [dispatch]);
  useEffect(() => {
    if (isContactArchiveToggled) {
      dispatch(getArchiveContact());
      dispatch(getFavourites());
      dispatch(getDirectMessages());
      dispatch(getChannels());
      dispatch(getChatUserDetails(chatUserDetails.id));
    }
  }, [dispatch, isContactArchiveToggled, chatUserDetails.id]);

  //serach recent user
  const searchUsers = () => {
    var li, a, i, txtValue: any;
    const inputValue: any = document.getElementById("serachChatUser");
    const filter: any = inputValue.value.toUpperCase();
    const ul: any = document.querySelector(".chat-room-list");
      li = ul.getElementsByTagName("li");
      for (i = 0; i < li.length; i++) {
        a = li[i].getElementsByTagName("a")[0];
        txtValue = a.textContent || a.innerText;
        if (txtValue.toUpperCase().indexOf(filter) > -1) {
          li[i].style.display = "";
        } else {
          li[i].style.display = "none";
        }
      }
  };

  const groupFriends = useMemo(() => {
    const merged = [...(directMessages || []), ...(favourites || [])];
    const friendsById = new Map<string, any>();
    merged.forEach((friend: any) => {
      if (!friend?.id) return;
      const key = String(friend.id);
      if (!friendsById.has(key)) {
        friendsById.set(key, friend);
      }
    });
    return Array.from(friendsById.values());
  }, [directMessages, favourites]);

  // Set of favourite user IDs for quick lookup in the DirectMessages list
  const favouriteIds = useMemo<Set<string>>(
    () => new Set<string>((favourites || []).map((u: any) => String(u.id))),
    [favourites]
  );

  const onToggleFavourite = (id: number | string) => {
    dispatch(toggleFavouriteContact(id));
  };

  return (
    <>
      <div>
        <div className="px-4 pt-4">
          <div className="d-flex align-items-start">
            <div className="flex-grow-1">
              <h4 className="mb-4">Chats</h4>
            </div>
          </div>
        </div>{" "}
        {/* .p-4 */}
        <AppSimpleBar className="chat-room-list">
          {/* Start chat-message-list */}
          {active === CHATS_TABS.DEFAULT && (
            <>
              {/* favourite */}
              <Favourites
                users={favourites}
                selectedChat={selectedChat}
                onSelectChat={onSelectChat}
                onToggleFavourite={onToggleFavourite}
              />

              {/* direct messages */}
              <DirectMessages
                users={directMessages}
                selectedChat={selectedChat}
                onSelectChat={onSelectChat}
                onToggleFavourite={onToggleFavourite}
                favouriteIds={favouriteIds}
              />

              {/* channels list */}
              <Chanels
                channels={channels}
                openCreateChannel={openCreateChannelModal}
                selectedChat={selectedChat}
                onSelectChat={onSelectChat}
              />
              <h5 className="text-center mb-2">
                <Link
                  to="#"
                  className="mb-3 px-4 mt-4 font-size-11 text-primary"
                  onClick={() => onChangeTab(CHATS_TABS.ARCHIVE)}
                >
                  Archived Contacts{" "}
                  <i className="bx bxs-archive-in align-middle" />
                </Link>
              </h5>
            </>
          )}
          {active === CHATS_TABS.ARCHIVE && (
            <>
              <Archive
                archiveContacts={archiveContacts}
                selectedChat={selectedChat}
                onSelectChat={onSelectChat}
              />
              <h5 className="text-center mb-2">
                <Link
                  to="#"
                  className="mb-3 px-4 mt-4 font-size-11 text-primary"
                  onClick={() => onChangeTab(CHATS_TABS.DEFAULT)}
                >
                  Chats <i className="bx bxs-archive-out align-middle" />
                </Link>
              </h5>
            </>
          )}

          {/* End chat-message-list */}
        </AppSimpleBar>
      </div>
      {/* add group Modal */}
      {isOpenCreateChannel && (
        <AddGroupModal
          isOpen={isOpenCreateChannel}
          onClose={closeCreateChannelModal}
          onCreateChannel={onCreateChannel}
          friends={groupFriends}
        />
      )}

    </>
  );
};

export default Index;
