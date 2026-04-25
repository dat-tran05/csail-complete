import chromadb
from chromadb.utils import embedding_functions


class VectorStore:
    def __init__(self, collection_name: str, persist_path: str):
        self._client = chromadb.PersistentClient(path=persist_path)
        self._ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        self._collection = self._client.get_or_create_collection(
            name=collection_name,
            embedding_function=self._ef,
        )

    def add_documents(self, docs: list[dict]) -> None:
        if not docs:
            return
        ids = [d["id"] for d in docs]
        texts = [d["text"] for d in docs]
        metadatas = [d.get("metadata", {}) for d in docs]
        self._collection.upsert(ids=ids, documents=texts, metadatas=metadatas)

    def query(self, query_text: str, n_results: int = 5, where: dict | None = None) -> list[dict]:
        count = self._collection.count()
        if count == 0:
            return []
        kwargs: dict = {
            "query_texts": [query_text],
            "n_results": min(n_results, count),
        }
        if where:
            kwargs["where"] = where
        results = self._collection.query(**kwargs)
        output = []
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        dists = results.get("distances", [[]])[0]
        for text, meta, dist in zip(docs, metas, dists):
            output.append({"text": text, "metadata": meta, "distance": dist})
        return output

    def count(self) -> int:
        return self._collection.count()
