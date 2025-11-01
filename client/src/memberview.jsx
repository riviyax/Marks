import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function MemberView() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("https://marks.vercel.app/api/members");
        const data = await res.json();
        const found = data.find((m) => m._id === id);
        setMember(found || null);
      } catch (error) {
        console.error(error);
        setMember(null);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) return <div className="text-center p-6 text-white bg-gray-900 min-h-screen">Loading...</div>;
  if (!member) return <div className="text-center p-6 text-white bg-gray-900 min-h-screen">Member not found</div>;

  return (
    <div className="bg-gray-900 min-h-screen flex flex-col items-center p-6 text-white">
      <div className="w-full max-w-2xl bg-gray-800 rounded-xl shadow-lg p-6 mt-10 border border-gray-700">
        <h1 className="text-4xl font-bold text-center mb-4">{member.name}</h1>

        <div className="flex justify-center gap-6 mb-6 text-lg">
          <p><span className="font-semibold text-gray-300">Rank:</span> {member.rank}</p>
          <p><span className="font-semibold text-gray-300">Marks:</span> {member.marks}</p>
        </div>

        <div
          className="mt-4 p-5 bg-gray-700 rounded-md text-gray-200 leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: member.info }}
        />
      </div>

      <footer className="mt-12 text-gray-400 text-sm opacity-75 hover:opacity-100 transition">
        Developed and Marks Updated by <span className="text-blue-400">Rivith Abinidu</span>
      </footer>
    </div>
  );
}
