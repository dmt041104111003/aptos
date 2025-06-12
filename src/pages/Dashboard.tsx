import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockJobs } from '@/data/mockData';
import { 
  TrendingUp, 
  Star, 
  DollarSign,
  Clock,
  CheckCircle,
  Sparkles,
  Award,
  Shield
} from 'lucide-react';
import Navbar from '@/components/ui2/Navbar';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<string>('in-progress');
  
  // Animation refs
  const heroRef = useRef(null);
  const statsRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const statsInView = useInView(statsRef, { once: true });

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      {/* Stats Section */}
      <section ref={statsRef} className="py-16 bg-gradient-to-br from-blue-900/20 via-violet-900/30 to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={statsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Stat 1 */}
            <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col gap-2 hover:border-blue-500/30 transition-all">
         
              <div className="text-3xl font-black text-blue-300 font-zentry">8,245 USDC</div>
              <div className="flex items-center gap-2 text-xs text-green-400 font-general">
                <TrendingUp className="w-4 h-4" />
                +12.5% <span className="text-blue-200">từ tháng trước</span>
              </div>
            </Card>
            {/* Stat 2 */}
            <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col gap-2 hover:border-violet-500/30 transition-all">
             
              <div className="text-3xl font-black text-violet-300 font-zentry">12</div>
              <div className="flex items-center gap-2 text-xs text-green-400 font-general">
                <Sparkles className="w-4 h-4" />
                +2 <span className="text-violet-200">tháng này</span>
              </div>
            </Card>
            {/* Stat 3 */}
            <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col gap-2 hover:border-yellow-400/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-yellow-200 font-general">Điểm danh tiếng</span>
                <Star className="w-7 h-7 text-yellow-400" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-yellow-300 font-zentry">4.8</span>
                <span className="text-xs text-yellow-200 mb-1">/5</span>
              </div>
              <div className="flex gap-1">
                {[1,2,3,4,5].map((star) => (
                  <Star key={star} className={`w-4 h-4 ${star <= 4 ? 'text-yellow-400' : 'text-gray-700'}`} />
                ))}
              </div>
            </Card>
            {/* Stat 4 */}
            <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6 flex flex-col gap-2 hover:border-green-400/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-green-200 font-general">Tỷ lệ thành công</span>
                <Award className="w-7 h-7 text-green-400" />
              </div>
              <div className="text-3xl font-black text-green-300 font-zentry">96%</div>
              <div className="flex items-center gap-2 text-xs text-green-400 font-general">
                <Shield className="w-4 h-4" />
                Xuất sắc
              </div>
            </Card>
          </motion.div>
          {/* Main Content Tabs */}
          <div className="mb-8 flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 shadow-lg backdrop-blur">
            <button
              className={`px-6 py-3 rounded-xl font-bold transition-all text-base ${
                activeTab === 'in-progress'
                  ? 'bg-blue-500 text-white shadow'
                  : 'text-blue-200 hover:bg-blue-500/10'
              }`}
              onClick={() => setActiveTab('in-progress')}
            >
              Đang thực hiện
            </button>
            <button
              className={`px-6 py-3 rounded-xl font-bold transition-all text-base ${
                activeTab === 'completed'
                  ? 'bg-blue-500 text-white shadow'
                  : 'text-blue-200 hover:bg-blue-500/10'
              }`}
              onClick={() => setActiveTab('completed')}
            >
              Hoàn thành
            </button>
            <button
              className={`px-6 py-3 rounded-xl font-bold transition-all text-base ${
                activeTab === 'earnings'
                  ? 'bg-blue-500 text-white shadow'
                  : 'text-blue-200 hover:bg-blue-500/10'
              }`}
              onClick={() => setActiveTab('earnings')}
            >
              Thu nhập
            </button>
            <button
              className={`px-6 py-3 rounded-xl font-bold transition-all text-base ${
                activeTab === 'reputation'
                  ? 'bg-blue-500 text-white shadow'
                  : 'text-blue-200 hover:bg-blue-500/10'
              }`}
              onClick={() => setActiveTab('reputation')}
            >
              Danh tiếng
            </button>
          </div>
          
          {activeTab === 'in-progress' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Dự án đang thực hiện</h2>
                <Badge className="border-blue-700 text-blue-700 bg-white font-semibold">{mockJobs.slice(0, 3).length} dự án</Badge>
              </div>
              
              {mockJobs.slice(0, 3).map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl hover:border-blue-500/30 transition-all duration-300">
                    <CardHeader>
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-semibold">{job.category}</Badge>
                            <span className="text-sm text-blue-400 flex items-center gap-1 font-semibold">
                              <Clock className="w-4 h-4" />
                              Đang thực hiện
                            </span>
                          </div>
                          <CardTitle className="text-xl text-white font-bold">{job.title}</CardTitle>
                          <CardDescription className="mt-2 flex items-center gap-4 text-gray-300 font-semibold">
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {job.budget.min}-{job.budget.max} {job.budget.currency}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {job.duration}
                            </span>
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-blue-200">{job.client.name}</div>
                            <div className="text-xs text-gray-400">Khách hàng</div>
                          </div>
                          <Avatar className="h-12 w-12 border-2 border-blue-500/30">
                            <AvatarImage src={job.client.avatar} />
                            <AvatarFallback className="bg-gray-100 text-blue-700">{job.client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-semibold text-blue-200">Tiến độ dự án</span>
                          <span className="text-sm font-bold text-blue-400">65%</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: '65%' }} />
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-blue-200 mb-3">Các mốc quan trọng</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 group">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-sm font-semibold text-green-200 group-hover:text-blue-400 transition-colors duration-200 cursor-pointer">Milestone 1: Hoàn thành</span>
                            <Badge className="bg-green-500/20 text-green-300 border-green-500/30 ml-auto font-semibold">Xong</Badge>
                          </div>
                          <div className="flex items-center gap-3 group">
                            <div className="w-5 h-5 rounded-full border-2 border-blue-400 bg-blue-900 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            </div>
                            <span className="text-sm font-semibold text-blue-200 group-hover:text-blue-400 transition-colors duration-200 cursor-pointer">Milestone 2: Đang thực hiện</span>
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 ml-auto font-semibold">Đang làm</Badge>
                          </div>
                          <div className="flex items-center gap-3 group">
                            <div className="w-5 h-5 rounded-full border-2 border-gray-500" />
                            <span className="text-sm text-gray-400 font-semibold group-hover:text-blue-400 transition-colors duration-200 cursor-pointer">Milestone 3: Chưa bắt đầu</span>
                            <Badge className="bg-gray-700 text-gray-300 border-gray-500 ml-auto font-semibold">Chờ</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center">
                          <Button className="group relative z-10 cursor-pointer overflow-hidden rounded-full  font-semibold py-3 px-8 transition-all duration-300 shadow border-white/20 text-white hover:bg-white/10">
                            <span className="relative inline-flex overflow-hidden font-primary text-base">
                              <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
                                Xem chi tiết
                              </div>
                              <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                                Xem chi tiết
                              </div>
                            </span>
                          </Button>
                          <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white group relative z-10 cursor-pointer overflow-hidden rounded-full  font-semibold py-3 px-8 transition-all duration-300 shadow border-white/20 text-white hover:bg-white/10">
                            <span className="relative inline-flex overflow-hidden font-primary text-base">
                              <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
                                Cập nhật tiến độ
                              </div>
                              <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                                Cập nhật tiến độ
                              </div>
                            </span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          {activeTab === 'completed' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4 font-heading text-corporate-accent">Completed Jobs</h2>
              
              {mockJobs.slice(3, 5).map((job) => (
                <Card key={job.id} className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6">
                  <CardHeader>
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <CardTitle className="font-heading text-gray-100">{job.title}</CardTitle>
                        <CardDescription className="mt-1 font-primary text-gray-400">
                          {job.budget.min}-{job.budget.max} {job.budget.currency} • Completed 3 weeks ago
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={job.client.avatar} />
                          <AvatarFallback className="bg-gray-700 text-blue-500">{job.client.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm font-primary text-gray-100">{job.client.name}</div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium font-primary text-gray-300">Rating</span>
                        <span className="text-sm font-medium font-primary text-blue-500">5.0</span>
                      </div>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gray-700 p-3 rounded-md">
                      <p className="text-sm italic text-gray-300 font-primary">
                        "Excellent work! Delivered ahead of schedule and the smart contract passed our audit with flying colors. Would definitely work with again!"
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4 font-heading text-corporate-accent">Earnings History</h2>
              
              <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6">
                <CardHeader>
                  <CardTitle className="font-heading text-gray-100">Earnings Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] flex items-center justify-center text-gray-400 font-primary">
                    [Earnings Chart Placeholder]
                  </div>
                </CardContent>
              </Card>
              
              <h3 className="text-lg font-semibold mt-6 mb-3 font-heading text-corporate-accent">Recent Transactions</h3>
              
              <div className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-corporate-light">
                    <thead className="bg-corporate-light">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider font-primary">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider font-primary">
                          Project
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider font-primary">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider font-primary">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider font-primary">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-corporate-white divide-y divide-corporate-light">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-primary">
                          Apr 20, 2023
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-primary">
                          Smart Contract Audit
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-primary">
                          NFT Creators Guild
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-primary">
                          4,500 USDC
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-corporate-success/10 text-corporate-success border border-corporate-success/20">
                            Completed
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-primary">
                          Apr 5, 2023
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-primary">
                          DeFi Dashboard UI
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-primary">
                          CryptoDesign Co
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-primary">
                          2,200 USDC
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-corporate-success/10 text-corporate-success border border-corporate-success/20">
                            Completed
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-primary">
                          Mar 22, 2023
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 font-primary">
                          NFT Marketplace
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-primary">
                          Decentralia Labs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-primary">
                          1,545 USDC
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-corporate-accent/10 text-corporate-accent border border-corporate-accent/20">
                            In Escrow
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'reputation' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4 font-heading text-corporate-accent">Reputation & Credentials</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6">
                  <CardHeader>
                    <CardTitle className="font-heading text-gray-100">Reputation Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center mb-4">
                      <div className="bg-blue-500 text-white text-4xl font-bold rounded-full w-20 h-20 flex items-center justify-center mr-4">
                        4.8
                      </div>
                      <div>
                        <div className="flex mb-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${star <= 4.8 ? 'text-yellow-500' : 'text-gray-600'}`} viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <p className="text-sm text-gray-400 font-primary">Based on 12 completed jobs</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-sm font-primary text-gray-300">Communication</div>
                          <div className="text-sm font-medium font-primary text-blue-500">4.9</div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-700 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: '98%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-sm font-primary text-gray-300">Quality of Work</div>
                          <div className="text-sm font-medium font-primary text-blue-500">5.0</div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-700 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: '100%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-sm font-primary text-gray-300">Timeliness</div>
                          <div className="text-sm font-medium font-primary text-blue-500">4.7</div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-700 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: '94%' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-sm font-primary text-gray-300">Code Quality</div>
                          <div className="text-sm font-medium font-primary text-blue-500">4.8</div>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-gray-700 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: '96%' }} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-gray-900/70 to-gray-800/70 border border-white/10 shadow-xl rounded-2xl p-6">
                  <CardHeader>
                    <CardTitle className="font-heading text-gray-100">Web3 Credentials</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium font-primary text-gray-100">Verified DID (Decentralized ID)</h3>
                          <p className="text-xs text-gray-400 mt-1 font-primary">did:ethr:0x1a2b3c...</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium font-primary text-gray-100">Lens Protocol Verification</h3>
                          <p className="text-xs text-gray-400 mt-1 font-primary">@web3dev.lens</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a4 4 0 00-4-4H8.8a4 4 0 00-2.6 1L3 6v7M3 13h18" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium font-primary text-gray-100">Skill NFTs</h3>
                          <p className="text-xs text-gray-400 mt-1 font-primary">3 verified skill credentials</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3 flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium font-primary text-gray-100">Gitcoin Passport</h3>
                          <p className="text-xs text-gray-400 mt-1 font-primary">24 stamps verified</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
