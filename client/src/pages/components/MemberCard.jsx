import React from "react";
import axios from "axios";
import EditMembers from "./UpdateMembers";

function MemberCard({ member }) {
  const onDeleteClick = (id) => {
    axios.delete(`http://localhost:3000/api/members/${id}`).catch((err) => {
      console.error(err);
    });
    window.location.reload();
  };

  return (
    <tr className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700 border-gray-200">
      <th
        scope="row"
        className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
      >
        {member.name}
      </th>
      <td className="px-6 py-4">{member.rank}</td>
      <td className="px-6 py-4">{member.marks}</td>
      <td className="px-6 py-4">
        <div className="flex gap-4">
          <a
            href="#"
            onClick={() => onDeleteClick(member._id)}
            className="font-medium text-red-600 dark:text-red-500 hover:underline"
          >
            Delete
          </a>
          <EditMembers member={member} /> {/* pass member here */}
        </div>
      </td>
    </tr>
  );
}

export default MemberCard;
