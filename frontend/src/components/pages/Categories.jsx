import React, { useEffect, useState } from 'react';

export const Categories = () => { const [categories, setCategories] = useState(null);

useEffect(() => { fetch('https://myshopper.local/api/categories', { credentials: 'include' }) .then(res => { console.log('fetch status', res.status); return res.json(); }) .then(data => { console.log('fetch data', data); setCategories(data); }) .catch(err => console.error('fetch error', err)); }, []);

if (categories === null) return <div>Loading...</div>; return (<><pre>{JSON.stringify(categories, null, 2)}</pre>;
<ul> {categories.map(c => <li key={c.id}>{c.title}</li>)} </ul> </> );}