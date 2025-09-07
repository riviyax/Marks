import React, { useState, useEffect } from "react";
import MemberCard from "./MemberCard";
import axios from "axios";

function Table() {
  const [members, setMembers] = useState([]);
  useEffect(() => {
    axios
      .get("http://localhost:3000/api/members")
      .then((res) => {
        setMembers(res.data);
        console.log(res.data);
      })
      .catch((err) => {
        console.log("Error fetching members:", err);
      });
  }, []);

  const memberList =
    members.length === 0
      ? "No members found"
      : members.map((member, index) => <MemberCard key={index} member={member} />);

  return (
    <div>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">
                Member Name
              </th>
              <th scope="col" className="px-6 py-3">
                Position
              </th>
              <th scope="col" className="px-6 py-3">
                Marks
              </th>
              <th scope="col" className="px-6 py-3">
                Action
              </th>
            </tr>
          </thead>
          <tbody>{memberList}</tbody>
        </table>
      </div>
    </div>
  );
}

export default Table;
