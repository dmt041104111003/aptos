import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { useProfile } from '../contexts/ProfileContext';
import { uploadJSONToIPFS } from '@/utils/pinata';
import { uploadFileToIPFS } from '@/utils/pinata';
import Groq from "groq-sdk";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

import { motion } from 'framer-motion';
import { 
  Briefcase, 
  Building2, 
  Globe, 
  DollarSign, 
  Clock, 
  MapPin, 
  Sparkles, 
  Zap,
  X,
  CheckCircle,
  Upload,
  Plus,
  ArrowRight,
  Rocket,
  Users,
  Shield,
  Star
} from 'lucide-react';
import Navbar from '@/components/ui2/Navbar';

const JOBS_MODULE_ADDRESS = import.meta.env.VITE_JOBS_CONTRACT_ADDRESS; // Assuming this will be your Aptos Jobs Module Address
const JOBS_MODULE_NAME = "jobs_contract"; // Replace with your actual Aptos Jobs Module Name

const config = new AptosConfig({ network: Network.DEVNET });
const aptos = new Aptos(config);

interface FormState {
  companyName: string;
  website: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  budgetMin: number;
  budgetMax: number;
  duration: string;
  location: 'remote' | 'onsite' | 'hybrid';
  immediate: boolean;
}

const PostJob = () => {
  const [aiMarkdown, setAiMarkdown] = useState<string>("");

  const navigate = useNavigate();
  const { account, accountType } = useWallet();
  const { profile } = useProfile();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAIAssisted, setIsAIAssisted] = useState(true);
  const [skill, setSkill] = useState<string>('');
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  
  const [form, setForm] = useState<FormState>({
    companyName: '',
    website: '',
    title: '',
    description: '',
    category: '',
    skills: [],
    budgetMin: 500,
    budgetMax: 2000,
    duration: '',
    location: 'remote',
    immediate: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompanyLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSkillAdd = () => {
    if (skill && !form.skills.includes(skill)) {
      setForm(prev => ({ ...prev, skills: [...prev.skills, skill] }));
      setSkill('');
    }
  };

  const handleSkillRemove = (skillToRemove: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  };

  const groq = new Groq({
    apiKey: import.meta.env.VITE_GROQ_API_KEY,
    dangerouslyAllowBrowser: true
  });
  const [prompt, setPrompt] = useState("");

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.companyName.trim()) newErrors.companyName = 'Vui lòng nhập tên công ty';
    if (!form.website.trim()) newErrors.website = 'Vui lòng nhập website công ty';
    if (!form.title.trim()) newErrors.title = 'Vui lòng nhập tiêu đề dự án';
    if (!form.description.trim()) newErrors.description = 'Vui lòng nhập mô tả công việc';
    if (!form.category.trim()) newErrors.category = 'Vui lòng chọn danh mục';
    if (!form.skills.length) newErrors.skills = 'Vui lòng nhập ít nhất 1 kỹ năng';
    if (!form.budgetMin || !form.budgetMax) newErrors.budget = 'Vui lòng nhập ngân sách';
    if (!form.duration.trim()) newErrors.duration = 'Vui lòng chọn thời gian thực hiện';
    if (!form.location.trim()) newErrors.location = 'Vui lòng chọn hình thức làm việc';
    return newErrors;
  };

  useEffect(() => {
    const newErrors = validateForm();
    setErrors(newErrors);
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc!');
      return;
    }
    try {
      let companyLogoCID = profile.profilePic;
    
      if (companyLogoFile) {
        const cid = await uploadFileToIPFS(companyLogoFile);
        const gateway = `https://${import.meta.env.VITE_PINATA_GATEWAY}/ipfs/${cid}`;
        
        const img = new Image();
        img.src = gateway;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Company logo not found on IPFS'));
        });
        
        companyLogoCID = gateway;
      }

      const jobData = {
        ...form,
        poster: account,
        posterProfile: profile.lastCID,
        postedAt: new Date().toISOString(),
        client: {
          id: profile.lastCID,
          name: form.companyName,
          avatar: companyLogoCID
        },
        budget: {
          min: form.budgetMin,
          max: form.budgetMax,
          currency: "USDC"
        }
      };
      
      const cid = await uploadJSONToIPFS(jobData);
      
      if (!account || accountType !== 'aptos' || !window.aptos) {
        toast.error('Vui lòng kết nối ví Aptos để đăng dự án.');
        return;
      }

      const txnPayload = {
        type: "entry_function_payload",
        function: `${JOBS_MODULE_ADDRESS}::${JOBS_MODULE_NAME}::post_job`,
        type_arguments: [],
        arguments: [cid]
      };
  
      const txnHash = await window.aptos.signAndSubmitTransaction(txnPayload);

      await aptos.waitForTransaction({ transactionHash: txnHash.hash });
  
      toast.success('Đăng dự án thành công!');
      navigate('/jobs');
    } catch (error) {
      console.error('Job post failed:', error);
      toast.error('Failed to post job');
    }
  };

  const stripMarkdown = (text: string) =>
    text
      .replace(/\*\*/g, "")
      .replace(/^- /gm, "")
      .replace(/[`*_#]/g, "")
      .trim();

  const categories = [
    { value: 'Smart Contract Development', label: 'Phát triển Smart Contract' },
    { value: 'Frontend Development', label: 'Phát triển Frontend' },
    { value: 'Backend Development', label: 'Phát triển Backend' },
    { value: 'Design', label: 'Thiết kế' },
    { value: 'Security', label: 'Bảo mật' },
    { value: 'Content', label: 'Nội dung' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Blockchain', label: 'Blockchain' },
  ];

  const durations = [
    { value: 'Less than 1 week', label: 'Dưới 1 tuần' },
    { value: '1-2 weeks', label: '1-2 tuần' },
    { value: '2-4 weeks', label: '2-4 tuần' },
    { value: '1-3 months', label: '1-3 tháng' },
    { value: '3-6 months', label: '3-6 tháng' },
    { value: 'Ongoing', label: 'Dài hạn' },
  ];

  const locations = [
    { value: 'remote', label: 'Làm việc từ xa', icon: Globe },
    { value: 'onsite', label: 'Tại văn phòng', icon: Building2 },
    { value: 'hybrid', label: 'Kết hợp', icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-blue-900/20 via-violet-900/30 to-black">
        <div className="absolute inset-0 bg-[url('/img/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Đăng <span className="text-white">Dự án</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Tìm kiếm tài năng Web3 toàn cầu. Đăng dự án của bạn và kết nối với những chuyên gia hàng đầu.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Benefits Card */}
            <motion.div 
              className="lg:col-span-1"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-white/10 backdrop-blur-sm h-full">
                <CardHeader className="text-center pb-6">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                    <Rocket className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-white mb-2">
                    Đăng dự án trên Web3Work
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Tiếp cận hơn 12,000 chuyên gia Web3 toàn cầu
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Users className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">12,000+ Chuyên gia</div>
                        <div className="text-sm text-gray-400">Tài năng Web3 toàn cầu</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Shield className="w-4 h-4 text-violet-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">Bảo mật ISO 27001</div>
                        <div className="text-sm text-gray-400">Thanh toán minh bạch, an toàn</div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Star className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">Hỗ trợ 24/7</div>
                        <div className="text-sm text-gray-400">Đội ngũ hỗ trợ Việt Nam</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-white/10">
                    <div className="text-center">
                      <div className="text-sm text-gray-400 mb-2">Đăng dự án miễn phí</div>
                      <div className="text-xs text-gray-500">Chỉ trả phí khi dự án hoàn thành thành công!</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Form */}
            <motion.div 
              className="lg:col-span-2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
            >
              <Card className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white flex items-center gap-3">
                    <Briefcase className="w-6 h-6 text-blue-400" />
                    Thông tin dự án
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Điền đầy đủ thông tin để tìm kiếm tài năng phù hợp
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Company Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="companyName" className="text-sm font-semibold text-white mb-2 block">
                            Tên công ty
                          </Label>
                          <Input
                            id="companyName"
                            name="companyName"
                            value={form.companyName}
                            onChange={handleInputChange}
                            placeholder="VD: Decentral Labs"
                            className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.companyName ? 'border-red-500/50' : ''}`}
                          />
                          {errors.companyName && (
                            <div className="text-red-400 text-xs mt-1">{errors.companyName}</div>
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor="website" className="text-sm font-semibold text-white mb-2 block">
                            Website công ty
                          </Label>
                          <Input
                            id="website"
                            name="website"
                            value={form.website}
                            onChange={handleInputChange}
                            placeholder="https://tencongty.vn"
                            className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.website ? 'border-red-500/50' : ''}`}
                          />
                          {errors.website && (
                            <div className="text-red-400 text-xs mt-1">{errors.website}</div>
                          )}
                        </div>
                      </div>

                      {/* Logo Upload */}
                      <div className="space-y-4">
                        <Label className="text-sm font-semibold text-white mb-2 block">
                          Logo công ty
                        </Label>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                          <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-2 border-blue-500/30">
                            <img 
                              src={logoPreview || (profile.profilePic || '/default-company.png')}
                              alt="Company Logo" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <label className="group relative z-10 cursor-pointer overflow-hidden rounded-full  font-semibold py-3 px-8 transition-all duration-300 shadow border-white/20 text-white hover:bg-white/10">
                            <span className="relative inline-flex overflow-hidden font-primary text-base">
                              <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
                                Tải lên logo
                              </div>
                              <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                                Tải lên logo
                              </div>
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleLogoChange}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Project Information */}
                    <div className="space-y-6">
                      <div>
                        <Label htmlFor="title" className="text-sm font-semibold text-white mb-2 block">
                          Tiêu đề dự án
                        </Label>
                        <Input
                          id="title"
                          name="title"
                          value={form.title}
                          onChange={handleInputChange}
                          placeholder="VD: Lập trình viên Smart Contract"
                          className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.title ? 'border-red-500/50' : ''}`}
                        />
                        {errors.title && (
                          <div className="text-red-400 text-xs mt-1">{errors.title}</div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="description" className="text-sm font-semibold text-white mb-2 block">
                          Mô tả công việc
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={form.description}
                          onChange={handleInputChange}
                          placeholder="Mô tả chi tiết yêu cầu, đầu việc, thời gian..."
                          className={`h-32 resize-none bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.description ? 'border-red-500/50' : ''}`}
                        />
                        {errors.description && (
                          <div className="text-red-400 text-xs mt-1">{errors.description}</div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="category" className="text-sm font-semibold text-white mb-2 block">
                            Danh mục
                          </Label>
                          <Select 
                            value={form.category}
                            onValueChange={(value) => handleSelectChange('category', value)}
                          >
                            <SelectTrigger className={`bg-white/10 border-white/20 text-white ${errors.category ? 'border-red-500/50' : ''}`}>
                              <SelectValue placeholder="Chọn danh mục" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700">
                              {categories.map((category) => (
                                <SelectItem key={category.value} value={category.value} className="text-white hover:bg-gray-800">
                                  {category.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.category && (
                            <div className="text-red-400 text-xs mt-1">{errors.category}</div>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="duration" className="text-sm font-semibold text-white mb-2 block">
                            Thời gian thực hiện
                          </Label>
                          <Select 
                            value={form.duration} 
                            onValueChange={(value) => handleSelectChange('duration', value)}
                          >
                            <SelectTrigger className={`bg-white/10 border-white/20 text-white ${errors.duration ? 'border-red-500/50' : ''}`}>
                              <SelectValue placeholder="Chọn thời gian" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700">
                              {durations.map((duration) => (
                                <SelectItem key={duration.value} value={duration.value} className="text-white hover:bg-gray-800">
                                  {duration.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.duration && (
                            <div className="text-red-400 text-xs mt-1">{errors.duration}</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold text-white mb-2 block">
                          Kỹ năng yêu cầu
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={skill}
                            onChange={(e) => setSkill(e.target.value)}
                            placeholder="VD: Solidity"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSkillAdd();
                              }
                            }}
                            className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.skills ? 'border-red-500/50' : ''}`}
                          />
                          <Button 
                            type="button" 
                            onClick={handleSkillAdd}
                            className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {form.skills.map((skill) => (
                            <Badge 
                              key={skill} 
                              variant="secondary" 
                              className="bg-blue-500/20 text-blue-300 border-blue-500/30 cursor-pointer hover:bg-blue-500/30 transition-colors"
                              onClick={() => handleSkillRemove(skill)}
                            >
                              {skill}
                              <X className="w-3 h-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                        {errors.skills && (
                          <div className="text-red-400 text-xs mt-1">{errors.skills}</div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-semibold text-white mb-2 block">
                            Ngân sách (USDC)
                          </Label>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Input
                                type="number"
                                value={form.budgetMin}
                                onChange={(e) => setForm(prev => ({ ...prev, budgetMin: Number(e.target.value) }))}
                                min={0}
                                placeholder="Min"
                                className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.budget ? 'border-red-500/50' : ''}`}
                              />
                              <div className="text-xs text-gray-400 mt-1">Tối thiểu</div>
                            </div>
                            <div>
                              <Input
                                type="number"
                                value={form.budgetMax}
                                onChange={(e) => setForm(prev => ({ ...prev, budgetMax: Number(e.target.value) }))}
                                min={form.budgetMin}
                                placeholder="Max"
                                className={`bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-blue-500/50 ${errors.budget ? 'border-red-500/50' : ''}`}
                              />
                              <div className="text-xs text-gray-400 mt-1">Tối đa</div>
                            </div>
                          </div>
                          {errors.budget && (
                            <div className="text-red-400 text-xs mt-1">{errors.budget}</div>
                          )}
                        </div>

                        <div>
                          <Label className="text-sm font-semibold text-white mb-2 block">
                            Hình thức làm việc
                          </Label>
                          <Select 
                            value={form.location} 
                            onValueChange={(value: 'remote' | 'onsite' | 'hybrid') => handleSelectChange('location', value)}
                          >
                            <SelectTrigger className={`bg-white/10 border-white/20 text-white ${errors.location ? 'border-red-500/50' : ''}`}>
                              <SelectValue placeholder="Chọn hình thức" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700">
                              {locations.map((location) => (
                                <SelectItem key={location.value} value={location.value} className="text-white hover:bg-gray-800">
                                  <div className="flex items-center gap-2">
                                    <location.icon className="w-4 h-4" />
                                    {location.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.location && (
                            <div className="text-red-400 text-xs mt-1">{errors.location}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-lg border border-white/10">
                        <Switch
                          id="immediate"
                          checked={form.immediate}
                          onCheckedChange={(checked) => setForm(prev => ({ ...prev, immediate: checked }))}
                          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-yellow-500 data-[state=checked]:to-orange-500"
                        />
                        <Label htmlFor="immediate" className="text-white cursor-pointer font-medium">
                          <div className="flex items-center gap-2">
                            <Zap className={`w-4 h-4 ${form.immediate ? 'text-yellow-400' : 'text-gray-400'}`} />
                            Cần bắt đầu ngay
                          </div>
                        </Label>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div >
                      <Button 
                        type="submit" 
                        size="lg"
                        disabled={Object.keys(errors).length > 0}
                        className="group bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white relative z-10 w-full cursor-pointer overflow-hidden rounded-full  font-semibold py-3 px-8 transition-all duration-300 shadow border-white/20 text-white hover:bg-white/10"                      >
                     
                        <span className="relative inline-flex overflow-hidden font-primary text-base">
                          <div className="translate-y-0 skew-y-0 transition duration-500 group-hover:translate-y-[-160%] group-hover:skew-y-12">
                            Đăng dự án
                          </div>
                          <div className="absolute translate-y-[164%] skew-y-12 transition duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                            Đăng dự án
                          </div>
                        </span>
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PostJob;