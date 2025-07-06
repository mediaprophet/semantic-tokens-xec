import React, { useState, useEffect, useCallback } from 'react';
// NOTE: IPFS & Solid client libraries are now loaded from a CDN via script tags.

// --- Ontology "Database" ---
const ontologiesDb = {
    dcterms: {
        name: 'Dublin Core Terms',
        prefix: 'dcterms',
        uri: 'http://purl.org/dc/terms/',
        terms: ['title', 'description', 'creator', 'date', 'identifier', 'publisher', 'rights'],
    },
    foaf: {
        name: 'Friend of a Friend',
        prefix: 'foaf',
        uri: 'http://xmlns.com/foaf/0.1/',
        terms: ['Person', 'name', 'givenName', 'familyName', 'mbox', 'homepage', 'maker', 'account'],
    },
    skos: {
        name: 'SKOS',
        prefix: 'skos',
        uri: 'http://www.w3.org/2004/02/skos/core#',
        terms: ['Concept', 'prefLabel', 'altLabel', 'definition', 'broader', 'narrower'],
    }
};

// --- Helper Components ---

const Input = ({ label, value, onChange, placeholder, type = 'text', disabled = false, listId }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            list={listId}
            className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:bg-gray-800 disabled:cursor-not-allowed"
        />
    </div>
);

const Select = ({ label, value, onChange, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <select
            value={value}
            onChange={onChange}
            className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        >
            {children}
        </select>
    </div>
);


const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
    const baseClasses = "px-4 py-2 rounded-md font-semibold text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-150 transform hover:scale-105";
    const variants = {
        primary: 'bg-blue-600 hover:bg-blue-500 text-white focus:ring-blue-500',
        secondary: 'bg-gray-600 hover:bg-gray-500 text-gray-200 focus:ring-gray-400',
        danger: 'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500',
    };
    return (
        <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variants[variant]} ${className} disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100`}>
            {children}
        </button>
    );
};

const TabButton = ({ children, onClick, isActive }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            isActive
                ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
        }`}
    >
        {children}
    </button>
);


// --- SHACL Components ---

const PropertyConstraintRow = ({ constraint, onUpdate, onRemove, vocabListId }) => {
    return (
        <div className="p-3 bg-gray-800/60 rounded-md border border-gray-700 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input listId={vocabListId} label="Path (e.g., foaf:name)" value={constraint.path} onChange={e => onUpdate(constraint.id, 'path', e.target.value)} placeholder="sh:path" />
                <Select label="Datatype" value={constraint.datatype} onChange={e => onUpdate(constraint.id, 'datatype', e.target.value)}>
                    <option value="">None</option>
                    <option value="xsd:string">xsd:string</option>
                    <option value="xsd:integer">xsd:integer</option>
                    <option value="xsd:decimal">xsd:decimal</option>
                    <option value="xsd:boolean">xsd:boolean</option>
                    <option value="xsd:date">xsd:date</option>
                </Select>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input type="number" label="Min Count" value={constraint.minCount} onChange={e => onUpdate(constraint.id, 'minCount', e.target.value)} placeholder="sh:minCount" />
                <Input type="number" label="Max Count" value={constraint.maxCount} onChange={e => onUpdate(constraint.id, 'maxCount', e.target.value)} placeholder="sh:maxCount" />
            </div>
            <div className="flex justify-end">
                <Button onClick={() => onRemove(constraint.id)} variant="danger">&times; Remove</Button>
            </div>
        </div>
    );
};

const ShaclShapeEditor = ({ shape, onUpdate, onRemove, onAddConstraint, onUpdateConstraint, onRemoveConstraint, vocabListId }) => {
    if (!shape) return <div className="text-gray-400 text-center p-8">Select a shape to edit, or create a new one.</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-blue-300">Editing: {shape.name}</h3>
                <Button onClick={() => onRemove(shape.id)} variant="danger">Delete Shape</Button>
            </div>
            <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                <Input label="Shape Name (e.g., UserShape)" value={shape.name} onChange={e => onUpdate(shape.id, 'name', e.target.value)} />
                <Input listId={vocabListId} label="Target Class (e.g., foaf:Person)" value={shape.targetClass} onChange={e => onUpdate(shape.id, 'targetClass', e.target.value)} placeholder="The class this shape applies to" />
            </div>
            <div>
                <h4 className="text-lg font-semibold text-gray-300 mt-6 mb-2">Property Constraints</h4>
                <div className="space-y-3">
                    {shape.constraints.map(c => (
                        <PropertyConstraintRow key={c.id} constraint={c} onUpdate={onUpdateConstraint} onRemove={onRemoveConstraint} vocabListId={vocabListId} />
                    ))}
                </div>
                <Button onClick={() => onAddConstraint(shape.id)} className="mt-4">Add Property Constraint</Button>
            </div>
        </div>
    );
};


// --- Main App Component ---

export default function App() {
    // --- State Management ---
    const [activeTab, setActiveTab] = useState('properties');
    
    // Form State
    const [tokenName, setTokenName] = useState('My Semantic Token');
    const [tokenTicker, setTokenTicker] = useState('MST');
    const [tokenDecimals, setTokenDecimals] = useState(2);
    const [properties, setProperties] = useState([
        { id: 1, key: 'dcterms:description', value: 'A token with rich, machine-readable metadata.', type: 'literal' },
        { id: 2, key: 'foaf:maker', value: 'https://my-profile.example.com', type: 'uri' },
    ]);
    const [shapes, setShapes] = useState([]);
    const [activeShapeId, setActiveShapeId] = useState(null);
    const [newShapeName, setNewShapeName] = useState("");
    const [selectedOntologies, setSelectedOntologies] = useState(['dcterms', 'foaf']);
    const [prefixes, setPrefixes] = useState([
        { id: 'dcterms', prefix: 'dcterms', uri: 'http://purl.org/dc/terms/' },
        { id: 'foaf', prefix: 'foaf', uri: 'http://xmlns.com/foaf/0.1/' },
        { id: 'owl', prefix: 'owl', uri: 'http://www.w3.org/2002/07/owl#' },
        { id: 'rdfs', prefix: 'rdfs', uri: 'http://www.w3.org/2000/01/rdf-schema#' },
        { id: 'sh', prefix: 'sh', uri: 'http://www.w3.org/ns/shacl#' },
        { id: 'xsd', prefix: 'xsd', uri: 'http://www.w3.org/2001/XMLSchema#' },
    ]);
    const [activeVocab, setActiveVocab] = useState([]);
    const [sameAsRelations, setSameAsRelations] = useState([]);

    // IPFS State
    const [ipfsApiUrl, setIpfsApiUrl] = useState('http://127.0.0.1:5001');
    const [isPublishing, setIsPublishing] = useState(false);
    const [ipfsCid, setIpfsCid] = useState(null);
    
    // Solid State
    const [solidSession, setSolidSession] = useState(null);
    const [webId, setWebId] = useState(null);
    const [solidIdp, setSolidIdp] = useState('https://solidcommunity.net');
    const [drafts, setDrafts] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    // Library Loading State
    const [isIpfsReady, setIsIpfsReady] = useState(false);
    const [isSolidReady, setIsSolidReady] = useState(false);

    const [rdfOutput, setRdfOutput] = useState('');
    const [message, setMessage] = useState(null);

    // --- Dynamic Script Loading ---
    const loadScript = (id, src, onReady) => {
        if (document.getElementById(id)) {
            onReady();
            return;
        }
        const script = document.createElement('script');
        script.id = id;
        script.src = src;
        script.async = true;
        script.onload = () => onReady();
        script.onerror = () => console.error(`Failed to load script: ${src}`);
        document.body.appendChild(script);
    };

    useEffect(() => {
        loadScript('ipfs-http-client-script', 'https://unpkg.com/ipfs-http-client/dist/index.min.js', () => setIsIpfsReady(true));
        loadScript('solid-client-authn-script', 'https://unpkg.com/@inrupt/solid-client-authn-browser/dist/solid-client-authn.bundle.js', () => {
            // FIX: Use jsdelivr CDN for a more reliable bundle link.
            loadScript('solid-client-script', 'https://cdn.jsdelivr.net/npm/@inrupt/solid-client@1.19.0/dist/solid-client.bundle.js', () => setIsSolidReady(true));
        });
    }, []);

    // --- Solid Authentication & Data ---
    const getDraftsContainerUrl = (userWebId) => {
        const podUrl = new URL(userWebId);
        podUrl.pathname = '/public/eCashTokenCreator/drafts/';
        return podUrl.href;
    };

    const fetchDrafts = useCallback(async (session) => {
        if (!session?.webId) return;
        const { getContainedResourceUrls, getSourceUrl, getStringNoLocale } = window.solidClient;
        const containerUrl = getDraftsContainerUrl(session.webId);
        try {
            const draftUrls = await getContainedResourceUrls(containerUrl, { fetch: session.fetch });
            const draftData = await Promise.all(draftUrls.map(async url => {
                const resource = await window.solidClient.getSolidDataset(url, { fetch: session.fetch });
                const thing = window.solidClient.getThing(resource, url);
                const name = getStringNoLocale(thing, "http://purl.org/dc/terms/title");
                return { url, name: name || 'Untitled Draft' };
            }));
            setDrafts(draftData);
        } catch (error) {
            console.log("No drafts folder found or other error, this is okay on first run.", error);
            setDrafts([]);
        }
    }, []);

    useEffect(() => {
        if (!isSolidReady) return;
        window.solidClientAuthentication.handleIncomingRedirect({ restorePreviousSession: true })
            .then(session => {
                if (session) {
                    setSolidSession(session);
                    setWebId(session.webId);
                    fetchDrafts(session);
                }
            });
    }, [isSolidReady, fetchDrafts]);

    const handleSolidLogin = () => {
        if (!isSolidReady) { showMessage("Solid client not ready yet.", "error"); return; }
        window.solidClientAuthentication.login({
            oidcIssuer: solidIdp,
            redirectUrl: window.location.href,
            clientName: "eCash Semantic Token Creator"
        });
    };

    const handleSolidLogout = () => {
        solidSession?.logout();
        setSolidSession(null);
        setWebId(null);
        setDrafts([]);
    };

    const getFullState = () => ({
        tokenName, tokenTicker, tokenDecimals, properties, shapes,
        selectedOntologies, prefixes, sameAsRelations
    });

    const setFullState = (newState) => {
        setTokenName(newState.tokenName || 'My Semantic Token');
        setTokenTicker(newState.tokenTicker || 'MST');
        setTokenDecimals(newState.tokenDecimals || 2);
        setProperties(newState.properties || []);
        setShapes(newState.shapes || []);
        setSelectedOntologies(newState.selectedOntologies || ['dcterms', 'foaf']);
        setPrefixes(newState.prefixes || []);
        setSameAsRelations(newState.sameAsRelations || []);
    };

    const handleSaveToPod = async () => {
        if (!solidSession || !tokenName.trim()) {
            showMessage("Please login and provide a token name to save.", "error");
            return;
        }
        setIsSaving(true);
        showMessage("Saving draft to Solid Pod...", "secondary");

        const { createSolidDataset, createThing, setThing, saveSolidDatasetAt, buildThing, getStringNoLocale } = window.solidClient;
        const containerUrl = getDraftsContainerUrl(solidSession.webId);
        const draftUrl = `${containerUrl}${encodeURIComponent(tokenName.trim())}.ttl`;
        
        const currentState = getFullState();

        let myThing = buildThing(createThing({ url: draftUrl }))
            .addStringNoLocale("http://purl.org/dc/terms/title", tokenName)
            .addStringNoLocale("http://www.w3.org/ns/iana/media-types/text/turtle#mediaType", JSON.stringify(currentState))
            .build();
            
        let myDataset = createSolidDataset();
        myDataset = setThing(myDataset, myThing);

        try {
            await saveSolidDatasetAt(draftUrl, myDataset, { fetch: solidSession.fetch });
            showMessage("Draft saved successfully!", "success");
            fetchDrafts(solidSession); // Refresh list
        } catch (error) {
            console.error("Error saving to Solid Pod:", error);
            showMessage("Failed to save draft.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadFromPod = async (url) => {
        showMessage("Loading draft...", "secondary");
        try {
            const resource = await window.solidClient.getSolidDataset(url, { fetch: solidSession.fetch });
            const thing = await window.solidClient.getThing(resource, url);
            const dataString = await window.solidClient.getStringNoLocale(thing, "http://www.w3.org/ns/iana/media-types/text/turtle#mediaType");
            if (dataString) {
                const parsedState = JSON.parse(dataString);
                setFullState(parsedState);
                showMessage("Draft loaded successfully!", "success");
            } else {
                throw new Error("Could not find data in the resource.");
            }
        } catch (error) {
            console.error("Error loading from Pod:", error);
            showMessage("Failed to load draft.", "error");
        }
    };


    // --- Vocabulary & Prefix Management ---
    useEffect(() => {
        const newVocab = selectedOntologies.flatMap(key => {
            const onto = ontologiesDb[key];
            return onto ? onto.terms.map(term => `${onto.prefix}:${term}`) : [];
        });
        setActiveVocab([...new Set(newVocab)]);

        const prefixesFromOntologies = selectedOntologies.map(key => ({
            id: key,
            prefix: ontologiesDb[key].prefix,
            uri: ontologiesDb[key].uri
        }));
        setPrefixes(currentPrefixes => {
            const newPrefixes = [...prefixesFromOntologies];
            currentPrefixes.forEach(p => {
                if (!newPrefixes.find(np => np.prefix === p.prefix)) newPrefixes.push(p);
            });
            return newPrefixes;
        });
    }, [selectedOntologies]);

    // --- RDF Generation Logic ---
    const generateRdf = useCallback(() => {
        const prefixLines = prefixes.filter(p => p.prefix && p.uri).map(p => `@prefix ${p.prefix}: <${p.uri}> .`).join('\n');
        const propertyLines = properties.filter(p => p.key && p.value).map(p => {
            const value = p.type === 'uri' ? `<${p.value}>` : `"${p.value.replace(/"/g, '\\"')}"`;
            return `  ${p.key} ${value} ;`;
        }).join('\n');
        const sameAsLines = sameAsRelations.filter(r => r.termA && r.termB).map(r => `${r.termA} owl:sameAs ${r.termB} .`).join('\n');
        const tokenDefinition = `<>\n  a <http://slp.dev/ont/v1#Token> ;\n  dcterms:title "${tokenName}" ;\n  <http://slp.dev/ont/v1#ticker> "${tokenTicker}" ;\n${propertyLines}\n.`;
        const shaclLines = shapes.map(shape => {
            if (!shape.name) return '';
            const shapeTriples = [`:${shape.name} a sh:NodeShape ;`];
            if (shape.targetClass) shapeTriples.push(`  sh:targetClass ${shape.targetClass} ;`);
            const constraintTriples = shape.constraints.map((c, index) => {
                const isLastConstraint = index === shape.constraints.length - 1 && !sameAsLines;
                const endChar = isLastConstraint ? '.' : ' ;';
                const constraintParts = [];
                if (c.path) constraintParts.push(`sh:path ${c.path}`);
                if (c.datatype) constraintParts.push(`sh:datatype ${c.datatype}`);
                if (c.minCount) constraintParts.push(`sh:minCount ${c.minCount}`);
                if (c.maxCount) constraintParts.push(`sh:maxCount ${c.maxCount}`);
                if (constraintParts.length === 0) return null;
                return `  sh:property [\n    ${constraintParts.join(' ;\n    ')}\n  ]${endChar}`;
            }).filter(Boolean).join('\n');
            return `${shapeTriples.join('\n')}\n${constraintTriples}`;
        }).join('\n\n');
        const fullRdf = `${prefixLines}\n\n${tokenDefinition.replace(/;\s*\./, ' .')}\n\n${shaclLines}\n\n${sameAsLines}`;
        setRdfOutput(fullRdf);
    }, [prefixes, properties, tokenName, tokenTicker, shapes, sameAsRelations]);

    useEffect(() => { generateRdf(); }, [generateRdf]);

    // --- Handlers ---
    const showMessage = (text, type = 'success') => { setMessage({ text, type }); setTimeout(() => setMessage(null), 3000); };
    const handleCopy = (text, successMessage) => { navigator.clipboard.writeText(text).then(() => showMessage(successMessage)).catch(() => showMessage('Failed to copy text.', 'error')); };

    const handlePublishToIpfs = async () => {
        if (!isIpfsReady || !window.IpfsHttpClient) { showMessage("IPFS client not ready.", "error"); return; }
        setIsPublishing(true);
        setIpfsCid(null);
        showMessage("Publishing to IPFS...", "secondary");
        try {
            const { create } = window.IpfsHttpClient;
            const ipfs = create({ url: ipfsApiUrl });
            const result = await ipfs.add(rdfOutput);
            setIpfsCid(result.cid.toString());
            showMessage("Successfully published to IPFS!", "success");
        } catch (error) {
            console.error("IPFS publishing error:", error);
            showMessage("Error publishing to IPFS. Check API URL and CORS config.", "error");
        } finally {
            setIsPublishing(false);
        }
    };

    const handleOntologyToggle = (key) => setSelectedOntologies(current => current.includes(key) ? current.filter(k => k !== key) : [...current, key]);
    const handleAddSameAs = () => setSameAsRelations([...sameAsRelations, {id: Date.now(), termA: '', termB: ''}]);
    const handleUpdateSameAs = (id, field, value) => setSameAsRelations(sameAsRelations.map(r => r.id === id ? {...r, [field]: value} : r));
    const handleRemoveSameAs = (id) => setSameAsRelations(sameAsRelations.filter(r => r.id !== id));
    const handleAddShape = () => {
        if (!newShapeName.trim()) { showMessage("Please enter a name.", "error"); return; }
        const newId = Date.now();
        setShapes([...shapes, { id: newId, name: newShapeName.trim(), targetClass: '', constraints: [] }]);
        setActiveShapeId(newId);
        setNewShapeName("");
    };
    const handleRemoveShape = (id) => { setShapes(shapes.filter(s => s.id !== id)); if (activeShapeId === id) setActiveShapeId(null); };
    const handleUpdateShape = (id, field, value) => setShapes(shapes.map(s => s.id === id ? { ...s, [field]: value } : s));
    const handleAddConstraint = (shapeId) => setShapes(shapes.map(s => s.id === shapeId ? { ...s, constraints: [...s.constraints, { id: Date.now(), path: '', datatype: '', minCount: '', maxCount: '' }] } : s));
    const handleRemoveConstraint = (constraintId) => setShapes(shapes.map(s => ({ ...s, constraints: s.constraints.filter(c => c.id !== constraintId) })));
    const handleUpdateConstraint = (constraintId, field, value) => setShapes(shapes.map(s => ({ ...s, constraints: s.constraints.map(c => c.id === constraintId ? { ...c, [field]: value } : c) })));
    const activeShape = shapes.find(s => s.id === activeShapeId);

    // --- Render ---
    return (
        <div className="bg-gray-800 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
            <datalist id="vocab-list">
                {activeVocab.map(term => <option key={term} value={term} />)}
            </datalist>

            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8">
                    <div className="text-left">
                        <h1 className="text-4xl font-bold text-blue-400">eCash Semantic Token Creator</h1>
                        <p className="text-gray-400 mt-2">Visually define your token's rules and generate its RDF metadata.</p>
                    </div>
                    <div className="text-right">
                        {!webId ? (
                            <div className="flex items-center space-x-2">
                                <Input label="Solid IDP" value={solidIdp} onChange={e => setSolidIdp(e.target.value)} placeholder="e.g., https://solidcommunity.net" />
                                <Button onClick={handleSolidLogin} disabled={!isSolidReady} className="mt-5">
                                    {isSolidReady ? "Login with Solid" : "Loading..."}
                                </Button>
                            </div>
                        ) : (
                            <div>
                                <p className="text-sm text-gray-300">Logged in as:</p>
                                <p className="text-md font-semibold text-green-400 truncate max-w-xs">{webId}</p>
                                <Button onClick={handleSolidLogout} variant="secondary" className="mt-2 text-xs">Logout</Button>
                            </div>
                        )}
                    </div>
                </header>
                
                {webId && (
                    <div className="bg-gray-900/50 p-4 rounded-lg shadow-lg mb-8 border border-blue-500/30">
                        <h2 className="text-xl font-semibold mb-3 text-blue-300">Solid Pod Storage</h2>
                        <div className="flex items-start space-x-4">
                            <Button onClick={handleSaveToPod} disabled={isSaving || !tokenName.trim()}>
                                {isSaving ? 'Saving...' : 'Save Current Draft'}
                            </Button>
                            <div className="flex-grow">
                                <Select label="Load a Draft" value="" onChange={e => handleLoadFromPod(e.target.value)} disabled={drafts.length === 0}>
                                    <option value="" disabled>{drafts.length > 0 ? 'Select a draft to load' : 'No drafts found'}</option>
                                    {drafts.map(d => <option key={d.url} value={d.url}>{d.name}</option>)}
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* LEFT COLUMN: EDITOR */}
                    <div className="bg-gray-900 p-1 sm:p-2 rounded-lg shadow-lg">
                       <div className="border-b border-gray-700">
                            <nav className="-mb-px flex space-x-2 px-4">
                                <TabButton onClick={() => setActiveTab('properties')} isActive={activeTab === 'properties'}>1. Properties & Links</TabButton>
                                <TabButton onClick={() => setActiveTab('shacl')} isActive={activeTab === 'shacl'}>2. SHACL Rules</TabButton>
                                <TabButton onClick={() => setActiveTab('ontologies')} isActive={activeTab === 'ontologies'}>3. Ontologies</TabButton>
                                <TabButton onClick={() => setActiveTab('namespaces')} isActive={activeTab === 'namespaces'}>4. Namespaces</TabButton>
                            </nav>
                        </div>
                        <div className="p-6">
                            {activeTab === 'properties' && (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 text-gray-200">Basic Token Details</h3>
                                        <div className="space-y-4 p-4 bg-gray-800/50 rounded-md">
                                            <Input label="Token Name" value={tokenName} onChange={(e) => setTokenName(e.target.value)} placeholder="e.g., My Awesome Token" />
                                            <Input label="Ticker Symbol" value={tokenTicker} onChange={(e) => setTokenTicker(e.target.value)} placeholder="e.g., MAT" />
                                            <Input label="Decimals" type="number" value={tokenDecimals} onChange={(e) => setTokenDecimals(e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 pt-4 text-gray-200">Metadata Properties</h3>
                                        <div className="space-y-3 p-4 bg-gray-800/50 rounded-md">
                                            {properties.map(prop => (
                                                <div key={prop.id} className="grid grid-cols-11 gap-2 items-end">
                                                    <div className="col-span-5"><Input listId="vocab-list" label="Property" value={prop.key} onChange={e => setProperties(properties.map(p => p.id === prop.id ? {...p, key: e.target.value} : p))} /></div>
                                                    <div className="col-span-5"><Input label="Value" value={prop.value} onChange={e => setProperties(properties.map(p => p.id === prop.id ? {...p, value: e.target.value} : p))} /></div>
                                                    <div className="col-span-1"><Button variant="danger" onClick={() => setProperties(properties.filter(p => p.id !== prop.id))}>&times;</Button></div>
                                                </div>
                                            ))}
                                            <Button onClick={() => setProperties([...properties, {id: Date.now(), key: '', value: '', type: 'literal'}])}>Add Property</Button>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-3 pt-4 text-gray-200">Equivalence Links (owl:sameAs)</h3>
                                        <div className="space-y-3 p-4 bg-gray-800/50 rounded-md">
                                            {sameAsRelations.map(r => (
                                                <div key={r.id} className="grid grid-cols-11 gap-2 items-center">
                                                    <div className="col-span-5"><Input listId="vocab-list" label="Term A" value={r.termA} onChange={e => handleUpdateSameAs(r.id, 'termA', e.target.value)} /></div>
                                                    <div className="col-span-5"><Input listId="vocab-list" label="Term B" value={r.termB} onChange={e => handleUpdateSameAs(r.id, 'termB', e.target.value)} /></div>
                                                    <div className="col-span-1 flex items-end h-full"><Button variant="danger" onClick={() => handleRemoveSameAs(r.id)}>&times;</Button></div>
                                                </div>
                                            ))}
                                            <Button onClick={handleAddSameAs}>Add Link</Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {activeTab === 'shacl' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-1 space-y-3">
                                        <h3 className="text-lg font-semibold text-gray-300">Defined Shapes</h3>
                                        <div className="space-y-2">
                                            {shapes.map(s => (
                                                <button key={s.id} onClick={() => setActiveShapeId(s.id)} className={`w-full text-left p-2 rounded ${activeShapeId === s.id ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                                    {s.name || '(Untitled Shape)'}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="pt-4 space-y-2">
                                            <Input label="New Shape Name" value={newShapeName} onChange={e => setNewShapeName(e.target.value)} placeholder="e.g., ContributionShape" />
                                            <Button onClick={handleAddShape} disabled={!newShapeName.trim()} className="w-full">Create Shape</Button>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <ShaclShapeEditor 
                                            shape={activeShape} 
                                            onUpdate={handleUpdateShape}
                                            onRemove={handleRemoveShape}
                                            onAddConstraint={handleAddConstraint}
                                            onUpdateConstraint={handleUpdateConstraint}
                                            onRemoveConstraint={handleRemoveConstraint}
                                            vocabListId="vocab-list"
                                        />
                                    </div>
                                </div>
                            )}
                            {activeTab === 'ontologies' && (
                                <div className="space-y-3">
                                    <h3 className="text-xl font-semibold mb-3 text-gray-200">Available Ontologies</h3>
                                    <p className="text-gray-400 text-sm">Select ontologies to activate their vocabulary for autocompletion.</p>
                                    {Object.entries(ontologiesDb).map(([key, {name, prefix}]) => (
                                        <label key={key} className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-md cursor-pointer hover:bg-gray-700/50">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedOntologies.includes(key)}
                                                onChange={() => handleOntologyToggle(key)}
                                                className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500"
                                            />
                                            <span className="font-semibold">{name} ({prefix})</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'namespaces' && (
                                <div className="space-y-2">
                                    {prefixes.map(p => (
                                        <div key={p.id} className="grid grid-cols-11 gap-2 items-center">
                                            <div className="col-span-4"><Input label="Prefix" value={p.prefix} onChange={e => setPrefixes(prefixes.map(pr => pr.id === p.id ? {...pr, prefix: e.target.value} : pr))} /></div>
                                            <div className="col-span-6"><Input label="URI" value={p.uri} onChange={e => setPrefixes(prefixes.map(pr => pr.id === p.id ? {...pr, uri: e.target.value} : pr))} /></div>
                                            <div className="col-span-1 flex items-end h-full"><Button variant="danger" onClick={() => setPrefixes(prefixes.filter(pr => pr.id !== p.id))}>&times;</Button></div>
                                        </div>
                                    ))}
                                    <Button onClick={() => setPrefixes([...prefixes, {id: Date.now(), prefix: '', uri: ''}])} variant="secondary" className="mt-4">Add Prefix</Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: OUTPUT & PUBLISH */}
                    <div className="space-y-8">
                        <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">5. Generated RDF (Turtle)</h2>
                            <div className="relative">
                                <pre className="bg-gray-900 text-green-300 p-4 rounded-md overflow-x-auto h-96 whitespace-pre-wrap font-mono text-sm leading-relaxed">
                                    <code>{rdfOutput}</code>
                                </pre>
                            </div>
                            <div className="mt-4 flex space-x-4">
                                <Button onClick={() => handleCopy(rdfOutput, 'RDF copied to clipboard!')}>Copy RDF</Button>
                            </div>
                        </div>

                        <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
                            <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">6. Publish to IPFS</h2>
                            <div className="space-y-4">
                                <Input label="IPFS API URL" value={ipfsApiUrl} onChange={e => setIpfsApiUrl(e.target.value)} />
                                <div className="text-xs text-gray-500">
                                    <p>Ensure your IPFS node is running and configured for API CORS requests from this origin.</p>
                                    <p>Example command: `ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'`</p>
                                </div>
                                <Button onClick={handlePublishToIpfs} disabled={isPublishing || !isIpfsReady}>
                                    {isPublishing ? 'Publishing...' : !isIpfsReady ? 'Loading IPFS...' : 'Publish to IPFS'}
                                </Button>
                                {ipfsCid && (
                                    <div className="pt-4 space-y-3">
                                        <h3 className="text-lg font-semibold text-green-400">Success!</h3>
                                        <p className="text-gray-400">Your token definition is now on the decentralized web.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {ipfsCid && (
                             <div className="bg-gray-900 p-6 rounded-lg shadow-lg">
                                <h2 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">7. Launch on eCash</h2>
                                <p className="text-gray-400 mb-4">Use the following parameters to create your token in a wallet like Cashtab.</p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Token Name</label>
                                        <div className="flex items-center space-x-2">
                                            <p className="bg-gray-700 p-2 rounded-md font-mono text-sm flex-grow">{tokenName}</p>
                                            <Button onClick={() => handleCopy(tokenName, 'Name Copied!')} variant="secondary">Copy</Button>
                                        </div>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Ticker Symbol</label>
                                        <div className="flex items-center space-x-2">
                                            <p className="bg-gray-700 p-2 rounded-md font-mono text-sm flex-grow">{tokenTicker}</p>
                                            <Button onClick={() => handleCopy(tokenTicker, 'Ticker Copied!')} variant="secondary">Copy</Button>
                                        </div>
                                    </div>
                                     <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Decimals</label>
                                        <div className="flex items-center space-x-2">
                                            <p className="bg-gray-700 p-2 rounded-md font-mono text-sm flex-grow">{tokenDecimals}</p>
                                            <Button onClick={() => handleCopy(tokenDecimals, 'Decimals Copied!')} variant="secondary">Copy</Button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Document URI</label>
                                        <div className="flex items-center space-x-2">
                                            <p className="bg-gray-700 p-2 rounded-md font-mono text-sm flex-grow">{`ipfs://${ipfsCid}`}</p>
                                            <Button onClick={() => handleCopy(`ipfs://${ipfsCid}`, 'URI Copied!')} variant="secondary">Copy</Button>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                         <a href="https://cashtab.com/" target="_blank" rel="noopener noreferrer" className="w-full">
                                            <Button className="w-full">
                                                Open Cashtab to Launch
                                            </Button>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
