import React, { useMemo, useState } from "react";

import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Label,
  Input,
  Form,
} from "reactstrap";

// interfaces
import { CreateChannelPostData } from "../redux/actions";
import { UserTypes } from "../data/chat";

// components
import AppSimpleBar from "./AppSimpleBar";

interface DataTypes {
  id: any;
  channelName: string;
  description: string;
}
interface GroupSelectableFriend {
  id: string | number;
  firstName: string;
  lastName: string;
}
interface ContactItemProps {
  contact: GroupSelectableFriend;
  selected: boolean;
  onSelectContact: (id: string | number, selected: boolean) => void;
}
const ContactItem = ({
  contact,
  selected,
  onSelectContact,
}: ContactItemProps) => {
  const fullName = `${contact.firstName} ${contact.lastName}`;
  const onCheck = (checked: boolean) => {
    onSelectContact(contact.id, checked);
  };

  return (
    <li>
      <div className="form-check">
        <Input
          type="checkbox"
          className="form-check-input"
          id={`contact-${contact.id}`}
          checked={selected}
          onChange={(e: any) => {
            onCheck(e.target.checked);
          }}
          value={fullName}
        />
        <Label className="form-check-label" htmlFor={`contact-${contact.id}`}>
          {fullName}
        </Label>
      </div>
    </li>
  );
};
interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChannel: (params: CreateChannelPostData) => void;
  friends: Array<UserTypes>;
}
const AddGroupModal = ({
  isOpen,
  onClose,
  onCreateChannel,
  friends,
}: AddGroupModalProps) => {
  const [selectedContacts, setSelectedContacts] = useState<
    Array<string | number>
  >([]);
  const onSelectContact = (id: string | number, selected: boolean) => {
    let modifiedList: Array<string | number> = [...selectedContacts];
    if (selected) {
      modifiedList = [...modifiedList, id];
    } else {
      modifiedList = modifiedList.filter(m => m + "" !== id + "");
    }
    setSelectedContacts(modifiedList);
  };

  const [data, setData] = useState<DataTypes>({
    id: "",
    channelName: "",
    description: "",
  });
  const onDataChange = (
    field: "id" | "channelName" | "description",
    value: any
  ) => {
    let modifiedData: DataTypes = { ...data };
    modifiedData[field] = value;
    setData(modifiedData);
  };

  const selectableFriends = useMemo<Array<GroupSelectableFriend>>(() => {
    return (friends || [])
      .map((friend) => ({
        id: friend.id,
        firstName: friend.firstName || "",
        lastName: friend.lastName || "",
      }))
      .filter((friend) => friend.id !== undefined && friend.id !== null);
  }, [friends]);

  const isValid = data.channelName.trim().length > 0 && selectedContacts.length > 0;

  const onSubmit = () => {
    if (!isValid) return;
    const params = {
      id: data.id,
      name: data.channelName,
      members: selectedContacts,
      description: data.description,
    };
    onCreateChannel(params);
  };

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      tabIndex={-1}
      centered
      scrollable
      color="white"
      id="addgroup-exampleModal"
      role="dialog">
      <ModalHeader toggle={onClose} className="bg-primary">
        <div className="modal-title modal-title-custom text-white bg-primary font-size-16">
          Create New Group
        </div>
      </ModalHeader>

      <ModalBody className="p-4">
        <Form>
          <div className="mb-4">
            <Label htmlFor="addgroupname-input" className="form-label">
              Group Name
            </Label>
            <Input
              type="text"
              className="form-control"
              id="addgroupname-input"
              placeholder="Enter Group Name"
              value={data.channelName || ""}
              onChange={(e: any) => {
                onDataChange("channelName", e.target.value);
              }}
            />
          </div>
          <div className="mb-4">
            <label className="form-label">Group Members</label>
            <div className="card border">
              <div className="card-header">
                <h5 className="font-size-15 mb-0">Friends</h5>
              </div>
              <div className="card-body p-2">
                <AppSimpleBar style={{ maxHeight: "180px" }}>
                  <ul className="list-unstyled contact-list mb-0">
                    {(selectableFriends || []).map(
                      (contact: GroupSelectableFriend, key: number) => {
                        const selected = selectedContacts.includes(contact.id);
                        return (
                          <ContactItem
                            contact={contact}
                            key={key}
                            selected={selected}
                            onSelectContact={onSelectContact}
                          />
                        );
                      }
                    )}
                  </ul>
                  {selectableFriends.length === 0 && (
                    <p className="text-muted px-2 py-1 mb-0">
                      No friends available to add yet.
                    </p>
                  )}
                </AppSimpleBar>
              </div>
            </div>
            <small className="text-muted d-block mt-2">
              Selected: {selectedContacts.length}
            </small>
          </div>
          <div className="mb-3">
            <Label htmlFor="addgroupdescription-input" className="form-label">
              Description
            </Label>
            <textarea
              className="form-control"
              id="addgroupdescription-input"
              rows={3}
              placeholder="Enter Description"
              value={data.description || ""}
              onChange={(e: any) => {
                onDataChange("description", e.target.value);
              }}
            />
          </div>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button color="link" type="button" onClick={onClose}>
          Close
        </Button>
        <Button
          type="button"
          color="primary"
          onClick={onSubmit}
          disabled={!isValid}
        >
          Create Group
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AddGroupModal;
