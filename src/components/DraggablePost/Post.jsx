import React, { useState, useEffect, useRef } from "react";
import LoginPage from "../../pages/LoginPage/LoginPage";
import PostList from "../PostList/PostList";
import AddPost from "../AddPost/AddPost";
import "./Post.css";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  where,
  query,
  onSnapshot,
  updateDoc,
  orderBy,
  writeBatch,
  deleteDoc // Firestore'dan veri silmek için gerekli fonksiyon
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { FaGripLines } from "react-icons/fa";
import { BsPencil, BsFillTrash3Fill } from "react-icons/bs";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

const Post = () => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [postOpen, setPostOpen] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        setUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        });

        const postsQuery = query(
          collection(db, "posts"),
          where("uid", "==", user.uid),
          orderBy("order")
        );
        const unsubscribePosts = onSnapshot(postsQuery, (snapshot) => {
          const newPosts = snapshot.docs.map((doc) => ({
            ...doc.data(),
            id: doc.id
          }));
          setPosts(newPosts);
        });
      } else {
        setUser(null);
        setPosts([]);
      }
    });

    return () => {
      unsubscribe();
      // Aboneliklerinizi burada iptal edebilirsiniz
    };
  }, []);

  const handleEditClick = async (post) => {
    if (editingId === post.id) return;
    setContent(post.content);
    setEditingId(post.id);
  };

  const handleSubmit = async (post) => {
    if (!content || editingId !== post.id) return;

    const updatedPost = {
      ...post,
      content
    };

    await updateDoc(doc(db, "posts", post.id), updatedPost);

    setContent("");
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "posts", id));
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const newPosts = Array.from(posts);
    const [reorderedItem] = newPosts.splice(result.source.index, 1);
    newPosts.splice(result.destination.index, 0, reorderedItem);

    // Yeniden hesaplanmış sıralama değerlerini oluştur
    const updatedPosts = newPosts.map((post, index) => ({
      ...post,
      order: index,
    }));

    // Sıralama bilgisini Firestore'a yaz
    const batch = writeBatch(db);
    updatedPosts.forEach((post) => {
      const ref = doc(db, "posts", post.id);
      batch.update(ref, post);
    });
    await batch.commit();

    // PostList componentinin yeniden render edilmesi için setPosts fonksiyonunu çağıralım
    setPosts(updatedPosts);
  };



  const handleBlur = (post) => {
    handleSubmit(post);
  };

  const handleClickOutside = (event) => {
    if (inputRef.current && !inputRef.current.contains(event.target)) {
      handleSubmit(posts.find((post) => post.id === editingId));
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = async (post) => {
    const updatedPost = {
      ...post,
      isActive: !post.isActive
    };

    await updateDoc(doc(db, "posts", post.id), updatedPost);
  };
  const changePostState = () => {
    setPostOpen(!postOpen);
    console.log(postOpen);
  }

  if (!user || !user.uid) return <LoginPage />;

  return (
    <div className="flex flex-col lg:flex-row">
      <div className="w-full lg:w-3/4">
        <div className="flex justify-center items-center m-5">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full  w-full h-auto md:w-1/3 " onClick={changePostState}>Add Section</button>
        </div>
        <div className={`add-section ${postOpen ? "open" : ""}`}>
          {postOpen && <AddPost />}
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="posts">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef} className="mt-4 md:mt-0">
                {posts.map((post, index) => (
                  <Draggable key={post.id} draggableId={post.id} index={index}>
                    {(provided) => (
                      <div
                        className="bg-white rounded-xl shadow-md mb-4 grid grid-cols-3 p-4   items-center lg:ml-40   "
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <div className="drag-icon items-center justify-start hidden lg:flex">
                          <FaGripLines className="text-gray-400" />
                        </div>
                        <div className=" col-start-1 col-span-3 lg:col-start-2 lg:col-span-2 items-center justify-center pr-20">
                          {editingId === post.id ? (
                            <div onBlur={() => handleBlur(post)}>

                              <div>
                                <input className="w-full font-bold focus:outline-none " ref={inputRef} defaultValue={content} onChange={(e) => setContent(e.target.value)} autoFocus />
                              </div>
                            </div>
                          ) : (
                            <div >
                              {post.url && post.isPdf ? (
                                <iframe src={post.url} width="100%" height="500px"
                                />
                              ) : (
                                post.url && <img src={post.url} alt={post.title} height="500px" width="500px " />
                              )}
                              {!post.url && (
                                <div>
                                  <p className="cursor-pointer items-center justify-center" onClick={() => handleEditClick(post)}>
                                    <h2 className="font-bold flex-nowrap ">{post.content}</h2>
                                  </p>
                                </div>
                              )}

                            </div>
                          )}
                        </div>
                        <div className="col-start-4 lg:flex lg:flex-col justify-center items-start">
                          <div className="m-4">
                            <div
                              className={post.isActive ? 'toggle-button active' : 'toggle-button'}
                              onClick={() => handleToggle(post)}
                            >
                              <div className="toggle-knob"></div>
                            </div>
                          </div>
                          <button
                            className="delete-btn ml-4"
                            onClick={() => handleDelete(post.id)}
                          >
                            <BsFillTrash3Fill className="delete-btn-icon" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      <div className="w-full md:w-1/3">
        <div className="mt-4 hidden lg:block">
          <PostList handleDragEnd={handleDragEnd} handleToggle={handleToggle} />
        </div>
      </div>
    </div>
  );




};

export default Post;