import React, { useEffect, useState } from 'react';
import api from '../api';

function Home() {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    api.get('/api/activities')
      .then(res => setActivities(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1>Eco Activities</h1>
      <ul>
        {activities.map((a, i) => (
          <li key={i}>{a.activityName} - {a.points} pts</li>
        ))}
      </ul>
    </div>
  );
}

export default Home;
