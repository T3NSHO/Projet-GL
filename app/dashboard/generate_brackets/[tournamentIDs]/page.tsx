'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import React from 'react';

type PageProps = {
  params: {
    tournamentIDs: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

const JoinTeam = ({ params }: PageProps) => {
  const router = useRouter();
  const { tournamentIDs } = params;
  const [status, setStatus] = useState('Processing...');

  useEffect(() => {
    if (tournamentIDs) {
      fetch(`/api/generate_the_brackets/${tournamentIDs}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then((res) => {
          if (res.ok) {
            setStatus('Success! You have created the brackets.');
            setTimeout(() => router.push('/dashboard'), 3000);
          } else {
            res.text().then((text) => setStatus(JSON.parse(text).error));
          }
        })
        .catch(() => {
          setStatus('An error occurred. Please try again later.');
        });
    }
  }, [tournamentIDs, router]);

  return (
    <div>
      <p>{status}</p>
    </div>
  );
}

export default JoinTeam;