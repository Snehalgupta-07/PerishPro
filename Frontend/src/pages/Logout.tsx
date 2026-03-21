import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Loader from '../components/common/Loader';

const Logout: React.FC = () => {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  
  useEffect(() => {
    logout();
    navigate('/auth');
  }, [logout, navigate]);
  
  return <Loader />;
};

export default Logout;
